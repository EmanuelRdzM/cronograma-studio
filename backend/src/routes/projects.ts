import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { assertProjectOwner } from '../auth.js';
import { asyncHandler, HttpError } from '../http.js';
import { isISODate } from '../dates.js';
import {
  archiveProject,
  createProject,
  duplicateProject,
  getProjectBundle,
  projectInclude,
  toProjectDTO,
  updateProject,
} from '../projectService.js';
import { rescheduleProject } from '../schedule.js';

export const projectRouter = Router();

const isoDate = z.string().refine(isISODate, 'Fecha inválida (usa YYYY-MM-DD)');
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido');

const projectFields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  description: z.string().max(4000).nullable().optional(),
  code: z.string().max(40).nullable().optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'archived']).optional(),
  color: hexColor.optional(),
  startDate: isoDate.optional(),
  timezone: z.string().max(80).optional(),
  schedulingMode: z.enum(['manual', 'automatic']).optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  holidays: z.array(isoDate).max(500).optional(),
  showToday: z.boolean().optional(),
  referenceDate: isoDate.nullable().optional(),
  defaultScale: z.enum(['day', 'week', 'month']).optional(),
};

const createSchema = z.object(projectFields);
const updateSchema = z.object(projectFields).partial();

projectRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        sort: z.enum(['updatedAt', 'name', 'startDate', 'endDate']).optional(),
        includeArchived: z.string().optional(),
      })
      .parse(req.query);

    const projects = await prisma.project.findMany({
      where: {
        ownerId: req.userId!,
        ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
        ...(query.includeArchived === 'true' ? {} : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { description: { contains: query.search } },
                { code: { contains: query.search } },
              ],
            }
          : {}),
      },
      include: projectInclude,
      orderBy:
        query.sort === 'name'
          ? { name: 'asc' }
          : query.sort === 'startDate'
            ? { startDate: 'asc' }
            : query.sort === 'endDate'
              ? { endDate: 'asc' }
              : { updatedAt: 'desc' },
    });
    res.json({ projects: projects.map(toProjectDTO) });
  }),
);

projectRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const project = await createProject(req.userId!, body);
    res.status(201).json({ project });
  }),
);

projectRouter.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const bundle = await getProjectBundle(req.params.projectId, req.userId!);
    res.json(bundle);
  }),
);

projectRouter.patch(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const project = await updateProject(req.params.projectId, req.userId!, body);
    res.json({ project });
  }),
);

projectRouter.delete(
  '/:projectId',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    await prisma.project.delete({ where: { id: req.params.projectId } });
    res.status(204).end();
  }),
);

projectRouter.post(
  '/:projectId/duplicate',
  asyncHandler(async (req, res) => {
    const project = await duplicateProject(req.params.projectId, req.userId!);
    res.status(201).json({ project });
  }),
);

projectRouter.post(
  '/:projectId/archive',
  asyncHandler(async (req, res) => {
    const body = z.object({ archived: z.boolean() }).parse(req.body);
    const project = await archiveProject(req.params.projectId, req.userId!, body.archived);
    res.json({ project });
  }),
);

projectRouter.post(
  '/:projectId/reschedule',
  asyncHandler(async (req, res) => {
    const result = await rescheduleProject(req.params.projectId, req.userId!);
    const bundle = await getProjectBundle(req.params.projectId, req.userId!);
    res.json({ ...result, ...bundle });
  }),
);

projectRouter.post(
  '/:projectId/phases',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const body = z
      .object({
        name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
        color: hexColor.nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(req.body);
    const last = await prisma.phase.findFirst({
      where: { projectId: req.params.projectId },
      orderBy: { sortOrder: 'desc' },
    });
    const phase = await prisma.phase.create({
      data: {
        projectId: req.params.projectId,
        name: body.name,
        color: body.color ?? null,
        sortOrder: body.sortOrder ?? (last?.sortOrder ?? -1) + 1,
      },
    });
    res.status(201).json({ phase });
  }),
);

projectRouter.post(
  '/:projectId/activities/reorder',
  asyncHandler(async (req, res) => {
    await assertProjectOwner(req.params.projectId, req.userId);
    const body = z
      .object({
        items: z
          .array(
            z.object({
              id: z.string(),
              sortOrder: z.number().int(),
              phaseId: z.string().nullable().optional(),
              parentId: z.string().nullable().optional(),
            }),
          )
          .min(1),
      })
      .parse(req.body);
    const ids = body.items.map((item) => item.id);
    const existing = await prisma.activity.findMany({
      where: { projectId: req.params.projectId, id: { in: ids } },
      select: { id: true },
    });
    if (existing.length !== new Set(ids).size) {
      throw new HttpError(400, 'Alguna actividad no pertenece al proyecto', 'INVALID_ACTIVITY');
    }
    await prisma.$transaction(
      body.items.map((item) =>
        prisma.activity.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            ...(item.phaseId !== undefined ? { phaseId: item.phaseId } : {}),
            ...(item.parentId !== undefined ? { parentId: item.parentId } : {}),
          },
        }),
      ),
    );
    res.json({ ok: true });
  }),
);
