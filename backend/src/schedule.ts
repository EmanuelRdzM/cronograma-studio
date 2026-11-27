import { prisma } from './db.js';
import { HttpError } from './http.js';
import {
  CalendarConfig,
  DurationUnit,
  addWorkingDaysAfter,
  endDateFromDuration,
  hasWorkingDay,
  parseHolidays,
  parseWorkingDays,
} from './calendar.js';
import { syncProjectEnd } from './projectService.js';

export interface ScheduleActivity {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  durationUnit: string;
}

export interface ScheduleDependency {
  id?: string;
  predecessorId: string;
  successorId: string;
  type: string;
  lag: number;
}

export interface ScheduleUpdate {
  id: string;
  startDate: string;
  endDate: string;
  duration: number;
}

/** Detecta si agregar predecessor -> successor crearía un ciclo. */
export function wouldCreateCycle(
  dependencies: ScheduleDependency[],
  predecessorId: string,
  successorId: string,
): boolean {
  if (predecessorId === successorId) return true;
  const adjacency = new Map<string, string[]>();
  for (const dependency of dependencies) {
    if (dependency.type !== 'FS') continue;
    const list = adjacency.get(dependency.predecessorId) ?? [];
    list.push(dependency.successorId);
    adjacency.set(dependency.predecessorId, list);
  }
  const stack = [successorId];
  const visited = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }
  return false;
}

function topologicalOrder(activities: ScheduleActivity[], dependencies: ScheduleDependency[]): string[] {
  const ids = new Set(activities.map((activity) => activity.id));
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const activity of activities) indegree.set(activity.id, 0);
  for (const dependency of dependencies) {
    if (dependency.type !== 'FS') continue;
    if (!ids.has(dependency.predecessorId) || !ids.has(dependency.successorId)) continue;
    indegree.set(dependency.successorId, (indegree.get(dependency.successorId) ?? 0) + 1);
    const list = adjacency.get(dependency.predecessorId) ?? [];
    list.push(dependency.successorId);
    adjacency.set(dependency.predecessorId, list);
  }
  const queue = activities.filter((activity) => (indegree.get(activity.id) ?? 0) === 0).map((a) => a.id);
  const order: string[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    order.push(current);
    for (const next of adjacency.get(current) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }
  // Si hubiera un ciclo no detectado, agrega el resto para no perder datos.
  if (order.length < activities.length) {
    for (const activity of activities) {
      if (!order.includes(activity.id)) order.push(activity.id);
    }
  }
  return order;
}

/**
 * Recalcula fechas respetando dependencias Fin → Inicio.
 * - Sin `anchorId`: recalcula todas las actividades que tienen predecesoras.
 * - Con `anchorId`: solo recalcula sus descendientes (no mueve la actividad editada).
 */
export function computeScheduleUpdates(
  activities: ScheduleActivity[],
  dependencies: ScheduleDependency[],
  calendar: CalendarConfig,
  anchorId?: string,
): ScheduleUpdate[] {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const incoming = new Map<string, ScheduleDependency[]>();
  for (const dependency of dependencies) {
    if (dependency.type !== 'FS') continue;
    if (!byId.has(dependency.predecessorId) || !byId.has(dependency.successorId)) continue;
    const list = incoming.get(dependency.successorId) ?? [];
    list.push(dependency);
    incoming.set(dependency.successorId, list);
  }

  let targets: Set<string> | null = null;
  if (anchorId) {
    targets = new Set<string>();
    const outgoing = new Map<string, string[]>();
    for (const dependency of dependencies) {
      if (dependency.type !== 'FS') continue;
      const list = outgoing.get(dependency.predecessorId) ?? [];
      list.push(dependency.successorId);
      outgoing.set(dependency.predecessorId, list);
    }
    const stack = [anchorId];
    while (stack.length) {
      const current = stack.pop()!;
      for (const next of outgoing.get(current) ?? []) {
        if (!targets.has(next)) {
          targets.add(next);
          stack.push(next);
        }
      }
    }
  }

  const order = topologicalOrder(activities, dependencies);
  const updates: ScheduleUpdate[] = [];

  for (const id of order) {
    if (targets && !targets.has(id)) continue;
    const activity = byId.get(id);
    if (!activity) continue;
    const predecessors = incoming.get(id) ?? [];
    if (predecessors.length === 0) continue;
    if (activity.type === 'summary') continue;

    const candidateStarts: string[] = [];
    for (const dependency of predecessors) {
      const predecessor = byId.get(dependency.predecessorId);
      if (!predecessor) continue;
      const lag = Math.max(0, dependency.lag || 0);
      candidateStarts.push(addWorkingDaysAfter(predecessor.endDate, lag, calendar));
    }
    if (candidateStarts.length === 0) continue;
    const newStart = candidateStarts.sort().at(-1)!;
    const isMilestone = activity.type === 'milestone';
    const duration = isMilestone ? 0 : Math.max(1, activity.duration);
    const newEnd = isMilestone
      ? newStart
      : endDateFromDuration(newStart, duration, calendar, activity.durationUnit as DurationUnit);

    if (newStart !== activity.startDate || newEnd !== activity.endDate) {
      updates.push({ id, startDate: newStart, endDate: newEnd, duration });
      activity.startDate = newStart;
      activity.endDate = newEnd;
      activity.duration = duration;
    }
  }
  return updates;
}

async function loadScheduleContext(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new HttpError(404, 'Proyecto no encontrado', 'NOT_FOUND');
  const calendar: CalendarConfig = {
    workingDays: parseWorkingDays(project.workingDays),
    holidays: parseHolidays(project.holidays),
  };
  if (!hasWorkingDay(calendar)) {
    throw new HttpError(400, 'El calendario no tiene días laborables', 'INVALID_CALENDAR');
  }
  const [activities, dependencies] = await Promise.all([
    prisma.activity.findMany({
      where: { projectId },
      select: { id: true, type: true, startDate: true, endDate: true, duration: true, durationUnit: true },
    }),
    prisma.dependency.findMany({ where: { projectId } }),
  ]);
  return { project, calendar, activities, dependencies };
}

export async function applyCascadeFrom(projectId: string, anchorId: string) {
  const { project, calendar, activities, dependencies } = await loadScheduleContext(projectId);
  if (project.schedulingMode !== 'automatic') return { changed: 0, updates: [] as ScheduleUpdate[] };
  const updates = computeScheduleUpdates(activities, dependencies, calendar, anchorId);
  if (updates.length) {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.activity.update({
          where: { id: update.id },
          data: { startDate: update.startDate, endDate: update.endDate, duration: update.duration },
        }),
      ),
    );
    await syncProjectEnd(projectId);
  }
  return { changed: updates.length, updates };
}

export async function rescheduleProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, ownerId: userId } });
  if (!project) throw new HttpError(404, 'Proyecto no encontrado', 'NOT_FOUND');
  const { calendar, activities, dependencies } = await loadScheduleContext(projectId);
  const updates = computeScheduleUpdates(activities, dependencies, calendar);
  if (updates.length) {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.activity.update({
          where: { id: update.id },
          data: { startDate: update.startDate, endDate: update.endDate, duration: update.duration },
        }),
      ),
    );
    await syncProjectEnd(projectId);
  }
  return { changed: updates.length, updates };
}

/**
 * En modo automático, alinea una actividad con sus predecesoras Fin → Inicio.
 * No mueve a sus sucesoras; para eso se llama applyCascadeFrom después.
 */
export async function alignActivityWithPredecessors(projectId: string, activityId: string) {
  const { project, calendar, activities, dependencies } = await loadScheduleContext(projectId);
  if (project.schedulingMode !== 'automatic') return false;
  const activity = activities.find((item) => item.id === activityId);
  if (!activity || activity.type === 'summary') return false;
  const incoming = dependencies.filter(
    (dependency) => dependency.type === 'FS' && dependency.successorId === activityId,
  );
  if (incoming.length === 0) return false;
  const byId = new Map(activities.map((item) => [item.id, item]));
  const starts: string[] = [];
  for (const dependency of incoming) {
    const predecessor = byId.get(dependency.predecessorId);
    if (!predecessor) continue;
    starts.push(addWorkingDaysAfter(predecessor.endDate, Math.max(0, dependency.lag || 0), calendar));
  }
  if (!starts.length) return false;
  const newStart = starts.sort().at(-1)!;
  const duration = activity.type === 'milestone' ? 0 : Math.max(1, activity.duration);
  const newEnd = activity.type === 'milestone'
    ? newStart
    : endDateFromDuration(newStart, duration, calendar, activity.durationUnit as DurationUnit);
  if (newStart === activity.startDate && newEnd === activity.endDate) return false;
  await prisma.activity.update({
    where: { id: activityId },
    data: { startDate: newStart, endDate: newEnd, duration },
  });
  await syncProjectEnd(projectId);
  return true;
}

export async function validateDependencyPredecessors(
  projectId: string,
  successorId: string,
  predecessorIds: string[],
) {
  const { activities, dependencies } = await loadScheduleContext(projectId);
  const activityIds = new Set(activities.map((activity) => activity.id));
  if (!activityIds.has(successorId)) {
    throw new HttpError(404, 'Actividad no encontrada', 'NOT_FOUND');
  }
  const unique = Array.from(new Set(predecessorIds));
  for (const predecessorId of unique) {
    if (!activityIds.has(predecessorId)) {
      throw new HttpError(400, 'La actividad predecesora no pertenece al proyecto', 'INVALID_DEPENDENCY');
    }
    if (predecessorId === successorId) {
      throw new HttpError(400, 'Una actividad no puede depender de sí misma', 'INVALID_DEPENDENCY');
    }
  }
  const existingOther = dependencies.filter(
    (dependency) => !(dependency.successorId === successorId && dependency.type === 'FS'),
  );
  const finalDependencies: ScheduleDependency[] = [...existingOther];
  for (const predecessorId of unique) {
    if (wouldCreateCycle(finalDependencies, predecessorId, successorId)) {
      throw new HttpError(400, 'La dependencia crearía un ciclo', 'DEPENDENCY_CYCLE');
    }
    finalDependencies.push({ predecessorId, successorId, type: 'FS', lag: 0 });
  }
  return unique;
}

export async function syncIncomingDependencies(
  projectId: string,
  successorId: string,
  predecessorIds: string[],
) {
  const unique = await validateDependencyPredecessors(projectId, successorId, predecessorIds);
  const existing = await prisma.dependency.findMany({
    where: { projectId, successorId, type: 'FS' },
  });
  const toDelete = existing.filter((dependency) => !unique.includes(dependency.predecessorId));
  const existingPreds = new Set(existing.map((dependency) => dependency.predecessorId));
  const toCreate = unique.filter((predecessorId) => !existingPreds.has(predecessorId));

  await prisma.$transaction([
    ...toDelete.map((dependency) => prisma.dependency.delete({ where: { id: dependency.id } })),
    ...toCreate.map((predecessorId) =>
      prisma.dependency.create({
        data: { projectId, predecessorId, successorId, type: 'FS', lag: 0 },
      }),
    ),
  ]);

  return { created: toCreate, deleted: toDelete.map((dependency) => dependency.id) };
}
