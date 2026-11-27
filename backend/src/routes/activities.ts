import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, HttpError } from '../http.js';
import { isISODate, todayISO } from '../dates.js';
import {
  countDuration,
  endDateFromDuration,
  nextWorkingDay,
  parseHolidays,
  parseWorkingDays,
  snapToWorkingDay,
} from '../calendar.js';
import type { DurationUnit } from '../calendar.js';
import { applyCascadeFrom, alignActivityWithPredecessors, syncIncomingDependencies, validateDependencyPredecessors } from '../schedule.js';
import { syncProjectEnd } from '../projectService.js';

export const activityRouter = Router();

const isoDate = z.string().refine(isISODate, 'Fecha inválida (usa YYYY-MM-DD)');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido');

const activityFields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(240),
  description: z.string().max(4000).nullable().optional(),
  phaseId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  type: z.enum(['task', 'summary', 'milestone']).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  duration: z.number().int().min(0).max(20_000).optional(),
  durationUnit: z.enum(['working_day', 'calendar_day']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  status: z.enum(['pending', 'in_progress', 'blocked', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  color: hexColor.nullable().optional(),
  assignee: z.string().max(120).nullable().optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().max(10_000).nullable().optional(),
  predecessorIds: z.array(z.string()).optional(),
};

const createSchema = z.object({
  ...activityFields,
  name: activityFields.name,
  startDate: isoDate,
});
const updateSchema = z.object(activityFields).partial();

async function findOwnedActivity(activityId: string, userId: string | undefined) {
  if (!userId) throw new HttpError(401, 'Debes iniciar sesión', 'UNAUTHENTICATED');
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, project: { ownerId: userId } },
    include: { project: true },
  });
  if (!activity) throw new HttpError(404, 'Actividad no encontrada', 'NOT_FOUND');
  return activity;
}

async function assertPhaseAndParent(
  projectId: string,
  phaseId: string | null | undefined,
  parentId: string | null | undefined,
  activityId?: string,
) {
  if (phaseId) {
    const phase = await prisma.phase.findFirst({ where: { id: phaseId, projectId } });
    if (!phase) throw new HttpError(400, 'La fase no pertenece al proyecto', 'INVALID_PHASE');
  }
  if (parentId) {
    if (parentId === activityId) {
      throw new HttpError(400, 'Una actividad no puede ser su propia actividad padre', 'INVALID_PARENT');
    }
    let cursor: string | null = parentId;
    let guard = 0;
    while (cursor && guard < 30) {
      const parent: { id: string; parentId: string | null } | null = await prisma.activity.findFirst({
        where: { id: cursor, projectId },
        select: { id: true, parentId: true },
      });
      if (!parent) throw new HttpError(400, 'La actividad padre no pertenece al proyecto', 'INVALID_PARENT');
      if (parent.id === activityId) {
        throw new HttpError(400, 'La jerarquía crearía un ciclo', 'INVALID_PARENT');
      }
      cursor = parent.parentId;
      guard += 1;
    }
  }
}

activityRouter.post(
  '/projects/:projectId/activities',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, ownerId: req.userId! },
    });
    if (!project) throw new HttpError(404, 'Proyecto no encontrado', 'NOT_FOUND');
    const body = createSchema.parse(req.body);
    await assertPhaseAndParent(project.id, body.phaseId, body.parentId);

    const calendar = {
      workingDays: parseWorkingDays(project.workingDays),
      holidays: parseHolidays(project.holidays),
    };
    const type = body.type ?? 'task';
    const unit = body.durationUnit ?? 'working_day';
    let startDate = body.startDate;
    if (unit === 'working_day') startDate = snapToWorkingDay(startDate, calendar);
    let endDate: string;
    let duration: number;
    if (type === 'milestone') {
      endDate = startDate;
      duration = 0;
    } else if (body.endDate) {
      endDate = body.endDate;
      if (unit === 'working_day') endDate = snapToWorkingDay(endDate, calendar);
      if (endDate < startDate) {
        throw new HttpError(400, 'La fecha de fin no puede ser anterior al inicio', 'INVALID_DATES');
      }
      duration = Math.max(1, countDuration(startDate, endDate, calendar, unit));
    } else {
      duration = Math.max(1, body.duration ?? 1);
      endDate = endDateFromDuration(startDate, duration, calendar, unit);
    }

    const last = await prisma.activity.findFirst({
      where: { projectId: project.id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const parent: { phaseId: string | null } | null = body.parentId
      ? await prisma.activity.findFirst({ where: { id: body.parentId }, select: { phaseId: true } })
      : null;
    const progress = body.progress ?? 0;
    const status =
      body.status ??
      (progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'pending');

    const activity = await prisma.activity.create({
      data: {
        projectId: project.id,
        phaseId: body.phaseId !== undefined ? body.phaseId : parent?.phaseId ?? null,
        parentId: body.parentId ?? null,
        name: body.name,
        description: body.description ?? null,
        type,
        startDate,
        endDate,
        duration,
        durationUnit: unit,
        progress,
        status,
        priority: body.priority ?? 'medium',
        color: body.color ?? null,
        assignee: body.assignee ?? null,
        sortOrder: body.sortOrder ?? (last?.sortOrder ?? -1) + 1,
        notes: body.notes ?? null,
      },
    });

    if (body.predecessorIds?.length) {
      await syncIncomingDependencies(project.id, activity.id, body.predecessorIds);
    }
    const aligned = await alignActivityWithPredecessors(project.id, activity.id);
    await syncProjectEnd(project.id);
    const cascade = await applyCascadeFrom(project.id, activity.id);
    const finalActivity = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    res.status(201).json({ activity: finalActivity, changed: cascade.changed + (aligned ? 1 : 0) });
  }),
);

activityRouter.patch(
  '/activities/:activityId',
  asyncHandler(async (req, res) => {
    const existing = await findOwnedActivity(req.params.activityId, req.userId);
    const body = updateSchema.parse(req.body);
    const project = existing.project;
    const phaseId = body.phaseId !== undefined ? body.phaseId : existing.phaseId;
    const parentId = body.parentId !== undefined ? body.parentId : existing.parentId;
    await assertPhaseAndParent(project.id, phaseId, parentId, existing.id);

    if (body.predecessorIds) {
      await validateDependencyPredecessors(project.id, existing.id, body.predecessorIds);
    }

    const calendar = {
      workingDays: parseWorkingDays(project.workingDays),
      holidays: parseHolidays(project.holidays),
    };
    const type = body.type ?? existing.type;
    const unit = (body.durationUnit ?? existing.durationUnit) as DurationUnit;
    let startDate = body.startDate ?? existing.startDate;
    if (body.startDate && unit === 'working_day') startDate = snapToWorkingDay(startDate, calendar);

    let endDate = existing.endDate;
    let duration = existing.duration;
    const datesWereSent =
      body.startDate !== undefined ||
      body.endDate !== undefined ||
      body.duration !== undefined ||
      body.type !== undefined ||
      body.durationUnit !== undefined;

    if (datesWereSent) {
      if (type === 'milestone') {
        endDate = startDate;
        duration = 0;
      } else if (body.endDate !== undefined) {
        endDate = unit === 'working_day' ? snapToWorkingDay(body.endDate, calendar) : body.endDate;
        if (endDate < startDate) {
          throw new HttpError(400, 'La fecha de fin no puede ser anterior al inicio', 'INVALID_DATES');
        }
        duration = Math.max(1, countDuration(startDate, endDate, calendar, unit));
      } else if (body.duration !== undefined) {
        duration = Math.max(1, body.duration);
        endDate = endDateFromDuration(startDate, duration, calendar, unit);
      } else {
        // Solo cambió el inicio: conserva la duración.
        duration = Math.max(1, existing.duration);
        endDate = endDateFromDuration(startDate, duration, calendar, unit);
      }
      if (endDate < startDate) {
        throw new HttpError(400, 'La fecha de fin no puede ser anterior al inicio', 'INVALID_DATES');
      }
    }

    const progress = body.progress ?? existing.progress;
    let status = body.status ?? existing.status;
    if (!body.status) {
      if (progress >= 100) status = 'completed';
      else if (progress <= 0) status = existing.status === 'completed' ? 'pending' : existing.status;
      else if (existing.status === 'completed' || existing.status === 'pending') status = 'in_progress';
    }

    const activity = await prisma.activity.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        phaseId: phaseId ?? null,
        parentId: parentId ?? null,
        type,
        startDate,
        endDate,
        duration,
        durationUnit: unit,
        progress,
        status,
        priority: body.priority ?? existing.priority,
        color: body.color !== undefined ? body.color : existing.color,
        assignee: body.assignee !== undefined ? body.assignee : existing.assignee,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });

    if (body.predecessorIds) {
      await syncIncomingDependencies(project.id, existing.id, body.predecessorIds);
    }
    const aligned = await alignActivityWithPredecessors(project.id, activity.id);
    await syncProjectEnd(project.id);
    const cascade = await applyCascadeFrom(project.id, activity.id);
    const finalActivity = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    res.json({ activity: finalActivity, changed: cascade.changed + (aligned ? 1 : 0) });
  }),
);

activityRouter.post(
  '/activities/:activityId/duplicate',
  asyncHandler(async (req, res) => {
    const existing = await findOwnedActivity(req.params.activityId, req.userId);
    const calendar = {
      workingDays: parseWorkingDays(existing.project.workingDays),
      holidays: parseHolidays(existing.project.holidays),
    };
    const startDate = existing.type === 'milestone'
      ? existing.endDate
      : nextWorkingDay(existing.endDate, calendar);
    const duration = Math.max(0, existing.duration);
    const endDate = endDateFromDuration(startDate, duration, calendar, existing.durationUnit as 'working_day' | 'calendar_day');
    const last = await prisma.activity.findFirst({
      where: { projectId: existing.projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const activity = await prisma.activity.create({
      data: {
        projectId: existing.projectId,
        phaseId: existing.phaseId,
        parentId: existing.parentId,
        name: `${existing.name} (copia)`,
        description: existing.description,
        type: existing.type,
        startDate,
        endDate,
        duration,
        durationUnit: existing.durationUnit,
        progress: 0,
        status: 'pending',
        priority: existing.priority,
        color: existing.color,
        assignee: existing.assignee,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        notes: existing.notes,
      },
    });
    await syncProjectEnd(existing.projectId);
    res.status(201).json({ activity });
  }),
);

activityRouter.delete(
  '/activities/:activityId',
  asyncHandler(async (req, res) => {
    const existing = await findOwnedActivity(req.params.activityId, req.userId);
    await prisma.activity.delete({ where: { id: existing.id } });
    await syncProjectEnd(existing.projectId);
    res.status(204).end();
  }),
);

activityRouter.patch(
  '/phases/:phaseId',
  asyncHandler(async (req, res) => {
    const phase = await prisma.phase.findFirst({
      where: { id: req.params.phaseId, project: { ownerId: req.userId! } },
      include: { project: true },
    });
    if (!phase) throw new HttpError(404, 'Fase no encontrada', 'NOT_FOUND');
    const body = z
      .object({
        name: z.string().trim().min(1).max(160).optional(),
        color: hexColor.nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const updated = await prisma.phase.update({
      where: { id: phase.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    res.json({ phase: updated });
  }),
);

activityRouter.delete(
  '/phases/:phaseId',
  asyncHandler(async (req, res) => {
    const phase = await prisma.phase.findFirst({
      where: { id: req.params.phaseId, project: { ownerId: req.userId! } },
    });
    if (!phase) throw new HttpError(404, 'Fase no encontrada', 'NOT_FOUND');
    await prisma.phase.delete({ where: { id: phase.id } });
    res.status(204).end();
  }),
);
