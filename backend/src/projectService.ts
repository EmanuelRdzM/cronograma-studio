import { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { parseHolidays, parseWorkingDays, serializeWorkingDays, countDuration } from './calendar.js';
import type { DurationUnit } from './calendar.js';
import { HttpError } from './http.js';
import { todayISO } from './dates.js';

export const projectInclude = {
  phases: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  activities: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  dependencies: { orderBy: { createdAt: 'asc' as const } },
};

export type ProjectWithData = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
type ActivityRecord = ProjectWithData['activities'][number];

export interface ProjectDTO {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  status: string;
  color: string;
  startDate: string;
  endDate: string | null;
  timezone: string;
  schedulingMode: string;
  workingDays: number[];
  holidays: string[];
  showToday: boolean;
  referenceDate: string | null;
  defaultScale: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  activityCount: number;
  phaseCount: number;
  computedStart: string;
  computedEnd: string;
}

export interface ProjectBundle {
  project: ProjectDTO;
  phases: ProjectWithData['phases'];
  activities: ProjectWithData['activities'];
  dependencies: ProjectWithData['dependencies'];
}

export function computeProgress(activities: ActivityRecord[]): number {
  const parentIds = new Set(activities.map((activity) => activity.parentId).filter(Boolean) as string[]);
  const weighted = activities.filter(
    (activity) =>
      activity.type === 'task' &&
      !parentIds.has(activity.id) &&
      activity.duration > 0,
  );
  if (weighted.length === 0) return 0;
  const total = weighted.reduce((sum, activity) => sum + activity.duration, 0);
  const done = weighted.reduce((sum, activity) => sum + activity.duration * activity.progress, 0);
  return Math.round(done / total);
}

export function toProjectDTO(project: ProjectWithData): ProjectDTO {
  const activityStarts = project.activities.map((activity) => activity.startDate).sort();
  const activityEnds = project.activities.map((activity) => activity.endDate).sort();
  const computedStart = activityStarts.length
    ? activityStarts[0] < project.startDate
      ? activityStarts[0]
      : project.startDate
    : project.startDate;
  const candidateEnds = [project.endDate, ...activityEnds].filter(Boolean) as string[];
  const computedEnd = candidateEnds.length
    ? candidateEnds.sort()[candidateEnds.length - 1]
    : project.startDate;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    code: project.code,
    status: project.status,
    color: project.color,
    startDate: project.startDate,
    endDate: project.endDate,
    timezone: project.timezone,
    schedulingMode: project.schedulingMode,
    workingDays: parseWorkingDays(project.workingDays),
    holidays: parseHolidays(project.holidays),
    showToday: project.showToday,
    referenceDate: project.referenceDate,
    defaultScale: project.defaultScale,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    progress: computeProgress(project.activities),
    activityCount: project.activities.length,
    phaseCount: project.phases.length,
    computedStart,
    computedEnd,
  };
}

export async function getProjectOrThrow(projectId: string, userId: string): Promise<ProjectWithData> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: projectInclude,
  });
  if (!project) throw new HttpError(404, 'Proyecto no encontrado', 'NOT_FOUND');
  return project;
}

export async function getProjectBundle(projectId: string, userId: string): Promise<ProjectBundle> {
  const project = await getProjectOrThrow(projectId, userId);
  return {
    project: toProjectDTO(project),
    phases: project.phases,
    activities: project.activities,
    dependencies: project.dependencies,
  };
}

export async function syncProjectEnd(projectId: string): Promise<string | null> {
  const last = await prisma.activity.findFirst({
    where: { projectId },
    orderBy: { endDate: 'desc' },
    select: { endDate: true },
  });
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { startDate: true } });
  const endDate = last?.endDate ?? project?.startDate ?? null;
  await prisma.project.update({ where: { id: projectId }, data: { endDate } });
  return endDate;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
  code?: string | null;
  status?: string;
  color?: string;
  startDate?: string;
  timezone?: string;
  schedulingMode?: string;
  workingDays?: number[];
  holidays?: string[];
  showToday?: boolean;
  referenceDate?: string | null;
  defaultScale?: string;
}

export async function createProject(userId: string, input: ProjectInput) {
  if (input.workingDays && input.workingDays.length === 0) {
    throw new HttpError(400, 'Debe existir al menos un día laborable', 'INVALID_CALENDAR');
  }
  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name: input.name,
      description: input.description ?? null,
      code: input.code ?? null,
      status: input.status ?? 'planning',
      color: input.color ?? '#4F46E5',
      startDate: input.startDate ?? todayISO(),
      timezone: input.timezone ?? 'America/Mexico_City',
      schedulingMode: input.schedulingMode ?? 'manual',
      workingDays: serializeWorkingDays(input.workingDays ?? [1, 2, 3, 4, 5]),
      holidays: JSON.stringify(input.holidays ?? []),
      showToday: input.showToday ?? true,
      referenceDate: input.referenceDate || null,
      defaultScale: input.defaultScale ?? 'day',
    },
    include: projectInclude,
  });
  return toProjectDTO(project);
}

export async function updateProject(projectId: string, userId: string, input: Partial<ProjectInput>) {
  await getProjectOrThrow(projectId, userId);
  if (input.workingDays && input.workingDays.length === 0) {
    throw new HttpError(400, 'Debe existir al menos un día laborable', 'INVALID_CALENDAR');
  }
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.code !== undefined ? { code: input.code || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.schedulingMode !== undefined ? { schedulingMode: input.schedulingMode } : {}),
      ...(input.workingDays !== undefined ? { workingDays: serializeWorkingDays(input.workingDays) } : {}),
      ...(input.holidays !== undefined ? { holidays: JSON.stringify(input.holidays) } : {}),
      ...(input.showToday !== undefined ? { showToday: input.showToday } : {}),
      ...(input.referenceDate !== undefined ? { referenceDate: input.referenceDate || null } : {}),
      ...(input.defaultScale !== undefined ? { defaultScale: input.defaultScale } : {}),
    },
    include: projectInclude,
  });

  // Si cambió el calendario, recalcula la duración de las actividades
  // existentes sin mover sus fechas.
  if (input.workingDays !== undefined || input.holidays !== undefined) {
    const calendar = {
      workingDays: parseWorkingDays(project.workingDays),
      holidays: parseHolidays(project.holidays),
    };
    const activities = await prisma.activity.findMany({ where: { projectId } });
    const updates = [];
    for (const activity of activities) {
      if (activity.type === 'milestone') continue;
      const duration = countDuration(
        activity.startDate,
        activity.endDate,
        calendar,
        activity.durationUnit as DurationUnit,
      );
      if (duration !== activity.duration) {
        updates.push(
          prisma.activity.update({
            where: { id: activity.id },
            data: { duration: Math.max(1, duration) },
          }),
        );
      }
    }
    if (updates.length) await prisma.$transaction(updates);
  }
  await syncProjectEnd(project.id);
  const refreshed = await prisma.project.findUniqueOrThrow({ where: { id: project.id }, include: projectInclude });
  return toProjectDTO(refreshed);
}

export async function archiveProject(projectId: string, userId: string, archived: boolean) {
  await getProjectOrThrow(projectId, userId);
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: archived ? new Date() : null, status: archived ? 'archived' : 'active' },
    include: projectInclude,
  });
  return toProjectDTO(project);
}

export async function duplicateProject(projectId: string, userId: string) {
  const original = await getProjectOrThrow(projectId, userId);
  return prisma.$transaction(async (tx) => {
    const copy = await tx.project.create({
      data: {
        ownerId: userId,
        name: `${original.name} (copia)`,
        description: original.description,
        code: original.code,
        status: 'planning',
        color: original.color,
        startDate: original.startDate,
        endDate: original.endDate,
        timezone: original.timezone,
        schedulingMode: original.schedulingMode,
        workingDays: original.workingDays,
        holidays: original.holidays,
        showToday: original.showToday,
        referenceDate: original.referenceDate,
        defaultScale: original.defaultScale,
      },
    });
    const phaseMap = new Map<string, string>();
    for (const phase of original.phases) {
      const created = await tx.phase.create({
        data: {
          projectId: copy.id,
          name: phase.name,
          color: phase.color,
          sortOrder: phase.sortOrder,
        },
      });
      phaseMap.set(phase.id, created.id);
    }
    const activityMap = new Map<string, string>();
    for (const activity of original.activities) {
      const created = await tx.activity.create({
        data: {
          projectId: copy.id,
          phaseId: activity.phaseId ? phaseMap.get(activity.phaseId) ?? null : null,
          name: activity.name,
          description: activity.description,
          type: activity.type,
          startDate: activity.startDate,
          endDate: activity.endDate,
          duration: activity.duration,
          durationUnit: activity.durationUnit,
          progress: activity.progress,
          status: activity.status,
          priority: activity.priority,
          color: activity.color,
          assignee: activity.assignee,
          sortOrder: activity.sortOrder,
          notes: activity.notes,
        },
      });
      activityMap.set(activity.id, created.id);
    }
    // Segunda pasada para jerarquía y dependencias.
    for (const activity of original.activities) {
      if (activity.parentId && activityMap.has(activity.parentId)) {
        await tx.activity.update({
          where: { id: activityMap.get(activity.id)! },
          data: { parentId: activityMap.get(activity.parentId)! },
        });
      }
    }
    for (const dependency of original.dependencies) {
      const predecessorId = activityMap.get(dependency.predecessorId);
      const successorId = activityMap.get(dependency.successorId);
      if (predecessorId && successorId) {
        await tx.dependency.create({
          data: {
            projectId: copy.id,
            predecessorId,
            successorId,
            type: dependency.type,
            lag: dependency.lag,
          },
        });
      }
    }
    const full = await tx.project.findUniqueOrThrow({ where: { id: copy.id }, include: projectInclude });
    return toProjectDTO(full);
  });
}
