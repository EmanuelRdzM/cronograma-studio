import type { Activity, Dependency, GanttScale, Phase, Project } from '@/api/types';
import {
  MONTHS_ES,
  MONTHS_ES_SHORT,
  WEEKDAYS_ES_LETTER,
  addDays,
  diffDays,
  endOfMonth,
  formatDayMonth,
  isoWeek,
  maxDate,
  minDate,
  startOfMonth,
  startOfWeek,
  todayISO,
  weekday,
} from '@/lib/dates';
import { phaseColor } from '@/lib/labels';
import { endDateFromDuration } from '@/lib/calendar';

export const PHASE_ROW_HEIGHT = 34;
export const ACTIVITY_ROW_HEIGHT = 42;
export const HEADER_HEIGHT = 58;
export const LEFT_WIDTH = 548;
export const COMPACT_LEFT_WIDTH = 246;

export interface ScaleUnit {
  key: string;
  x: number;
  width: number;
  label: string;
  sublabel: string;
  isWeekend?: boolean;
  isHoliday?: boolean;
  date: string;
}

export interface ScaleGroup {
  key: string;
  x: number;
  width: number;
  label: string;
}

export interface ScaleBand {
  x: number;
  width: number;
  kind: 'weekend' | 'holiday';
}

export interface GanttLayout {
  scale: GanttScale;
  rangeStart: string;
  rangeEnd: string;
  totalDays: number;
  pxPerDay: number;
  width: number;
  groups: ScaleGroup[];
  units: ScaleUnit[];
  bands: ScaleBand[];
  groupBoundaries: number[];
  unitBoundaries: number[];
}

export interface GanttPhaseGroup {
  key: string;
  phaseId: string | null;
  phase: Phase | null;
  name: string;
  color: string;
  phaseIndex: number;
  visibleActivities: Activity[];
  allActivities: Activity[];
  progress: number;
  start: string | null;
  end: string | null;
  collapsed: boolean;
}

export interface PhaseRow {
  kind: 'phase';
  id: string;
  height: number;
  y: number;
  phase: Phase | null;
  phaseIndex: number;
  name: string;
  color: string;
  progress: number;
  start: string | null;
  end: string | null;
  activityCount: number;
  collapsed: boolean;
  depth: number;
  rootKey: string;
}

export interface ActivityRow {
  kind: 'activity';
  id: string;
  height: number;
  y: number;
  activity: Activity;
  phaseIndex: number;
  phaseColor: string;
  depth: number;
  rootKey: string;
}

export type GanttRow = PhaseRow | ActivityRow;

export interface FilterOptions {
  search?: string;
  status?: string;
  phaseId?: string;
}

export const BASE_PX_PER_DAY: Record<GanttScale, number> = {
  day: 32,
  week: 10,
  month: 3.6,
};

export const MIN_PX_PER_DAY: Record<GanttScale, number> = {
  day: 14,
  week: 5.5,
  month: 2.1,
};

export const MAX_PX_PER_DAY: Record<GanttScale, number> = {
  day: 64,
  week: 22,
  month: 8.5,
};

function weightedProgress(activities: Activity[]): number {
  const parentIds = new Set(activities.map((activity) => activity.parentId).filter(Boolean) as string[]);
  const tasks = activities.filter(
    (activity) => activity.type === 'task' && !parentIds.has(activity.id) && activity.duration > 0,
  );
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, activity) => sum + activity.duration, 0);
  const done = tasks.reduce((sum, activity) => sum + activity.duration * activity.progress, 0);
  return Math.round(done / total);
}

export function buildPhaseGroups(
  phases: Phase[],
  activities: Activity[],
  collapsedPhaseIds: Set<string>,
  filters: FilterOptions = {},
): GanttPhaseGroup[] {
  const orderedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const search = filters.search?.trim().toLowerCase() ?? '';
  const status = filters.status && filters.status !== 'all' ? filters.status : null;
  const phaseFilter = filters.phaseId && filters.phaseId !== 'all' ? filters.phaseId : null;
  const hasFilter = Boolean(search || status || phaseFilter);

  const matches = (activity: Activity) => {
    if (status && activity.status !== status) return false;
    if (search) {
      const haystack = `${activity.name} ${activity.description ?? ''} ${activity.assignee ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  };

  const groups: GanttPhaseGroup[] = [];
  const knownPhaseIds = new Set(orderedPhases.map((phase) => phase.id));
  const orphans = activities.filter((activity) => !activity.phaseId || !knownPhaseIds.has(activity.phaseId));

  const makeGroup = (
    phase: Phase | null,
    groupActivities: Activity[],
    index: number,
    key: string,
  ): GanttPhaseGroup => {
    const visible = groupActivities.filter(matches);
    const starts = groupActivities.map((activity) => activity.startDate).sort();
    const ends = groupActivities.map((activity) => activity.endDate).sort();
    return {
      key,
      phaseId: phase?.id ?? null,
      phase,
      name: phase?.name ?? (orderedPhases.length ? 'Sin fase' : 'Actividades'),
      color: phaseColor(index, phase?.color),
      phaseIndex: index,
      visibleActivities: visible,
      allActivities: groupActivities,
      progress: weightedProgress(groupActivities),
      start: starts[0] ?? null,
      end: ends[ends.length - 1] ?? null,
      collapsed: phase ? collapsedPhaseIds.has(phase.id) : false,
    };
  };

  orderedPhases.forEach((phase, index) => {
    if (phaseFilter && phaseFilter !== phase.id) return;
    const groupActivities = activities.filter((activity) => activity.phaseId === phase.id);
    const group = makeGroup(phase, groupActivities, index, phase.id);
    if (hasFilter && group.visibleActivities.length === 0) return;
    groups.push(group);
  });

  if (orphans.length) {
    if (!phaseFilter || phaseFilter === '__orphans__') {
      const group = makeGroup(null, orphans, orderedPhases.length, '__orphans__');
      if (!hasFilter || group.visibleActivities.length > 0) groups.push(group);
    }
  }

  return groups;
}

function treeForGroup(group: GanttPhaseGroup): { activity: Activity; depth: number }[] {
  const activities = group.visibleActivities;
  const byParent = new Map<string | null, Activity[]>();
  for (const activity of activities) {
    const key = activity.parentId && activities.some((item) => item.id === activity.parentId)
      ? activity.parentId
      : null;
    const list = byParent.get(key) ?? [];
    list.push(activity);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));
  }
  const result: { activity: Activity; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    if (depth > 4) return;
    for (const activity of byParent.get(parentId) ?? []) {
      result.push({ activity, depth });
      walk(activity.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export function buildRows(groups: GanttPhaseGroup[]): GanttRow[] {
  const rows: GanttRow[] = [];
  let y = 0;
  for (const group of groups) {
    rows.push({
      kind: 'phase',
      id: `phase-${group.key}`,
      height: PHASE_ROW_HEIGHT,
      y,
      phase: group.phase,
      phaseIndex: group.phaseIndex,
      name: group.name,
      color: group.color,
      progress: group.progress,
      start: group.start,
      end: group.end,
      activityCount: group.allActivities.length,
      collapsed: group.collapsed,
      depth: 0,
      rootKey: group.key,
    });
    y += PHASE_ROW_HEIGHT;
    if (!group.collapsed) {
      for (const item of treeForGroup(group)) {
        rows.push({
          kind: 'activity',
          id: item.activity.id,
          height: ACTIVITY_ROW_HEIGHT,
          y,
          activity: item.activity,
          phaseIndex: group.phaseIndex,
          phaseColor: group.color,
          depth: item.depth,
          rootKey: group.key,
        });
        y += ACTIVITY_ROW_HEIGHT;
      }
    }
  }
  return rows;
}

export function projectRange(
  project: Project,
  activities: Activity[],
): { start: string; end: string } {
  let start = project.startDate;
  let end = project.computedEnd || project.startDate;
  for (const activity of activities) {
    if (activity.startDate < start) start = activity.startDate;
    if (activity.endDate > end) end = activity.endDate;
  }
  return { start, end };
}

export function buildLayout(
  project: Project,
  activities: Activity[],
  scale: GanttScale,
  zoomFactor: number,
): GanttLayout {
  const pxPerDay = Math.min(
    MAX_PX_PER_DAY[scale],
    Math.max(MIN_PX_PER_DAY[scale], BASE_PX_PER_DAY[scale] * zoomFactor),
  );
  const baseRange = projectRange(project, activities);
  const paddingDays = scale === 'day' ? 3 : scale === 'week' ? 7 : 20;
  let rangeStart = addDays(baseRange.start, -paddingDays);
  let rangeEnd = addDays(baseRange.end, paddingDays);
  if (rangeEnd < rangeStart) rangeEnd = rangeStart;
  const totalDays = diffDays(rangeStart, rangeEnd) + 1;
  const width = Math.max(240, totalDays * pxPerDay);

  const groups: ScaleGroup[] = [];
  const units: ScaleUnit[] = [];
  const bands: ScaleBand[] = [];
  const groupBoundaries: number[] = [];
  const unitBoundaries: number[] = [];

  const workingDays = new Set(project.workingDays ?? [1, 2, 3, 4, 5]);
  const holidays = new Set(project.holidays ?? []);

  if (scale === 'day') {
    let monthStart = startOfMonth(rangeStart);
    while (monthStart <= rangeEnd) {
      const clippedStart = maxDate(monthStart, rangeStart);
      const clippedEnd = minDate(endOfMonth(monthStart), rangeEnd);
      if (clippedStart <= clippedEnd) {
        const x = diffDays(rangeStart, clippedStart) * pxPerDay;
        const unitCount = diffDays(clippedStart, clippedEnd) + 1;
        groups.push({
          key: monthStart,
          x,
          width: unitCount * pxPerDay,
          label: `${MONTHS_ES[Number(monthStart.slice(5, 7)) - 1]} ${monthStart.slice(0, 4)}`,
        });
      }
      monthStart = addDays(endOfMonth(monthStart), 1);
    }
    for (let index = 0; index < totalDays; index += 1) {
      const date = addDays(rangeStart, index);
      const dayOfWeek = weekday(date);
      const isHoliday = holidays.has(date);
      const isWeekend = !workingDays.has(dayOfWeek) || isHoliday;
      const x = index * pxPerDay;
      units.push({
        key: date,
        x,
        width: pxPerDay,
        label: String(Number(date.slice(8, 10))),
        sublabel: WEEKDAYS_ES_LETTER[dayOfWeek],
        isWeekend,
        isHoliday,
        date,
      });
      if (isWeekend) {
        bands.push({ x, width: pxPerDay, kind: isHoliday ? 'holiday' : 'weekend' });
      }
      unitBoundaries.push(x);
    }
  } else if (scale === 'week') {
    let monthStart = startOfMonth(rangeStart);
    while (monthStart <= rangeEnd) {
      const clippedStart = maxDate(monthStart, rangeStart);
      const clippedEnd = minDate(endOfMonth(monthStart), rangeEnd);
      if (clippedStart <= clippedEnd) {
        groups.push({
          key: monthStart,
          x: diffDays(rangeStart, clippedStart) * pxPerDay,
          width: (diffDays(clippedStart, clippedEnd) + 1) * pxPerDay,
          label: `${MONTHS_ES[Number(monthStart.slice(5, 7)) - 1]} ${monthStart.slice(0, 4)}`,
        });
      }
      monthStart = addDays(endOfMonth(monthStart), 1);
    }
    let cursor = startOfWeek(rangeStart);
    while (cursor <= rangeEnd) {
      const clippedStart = maxDate(cursor, rangeStart);
      const clippedEnd = minDate(addDays(cursor, 6), rangeEnd);
      const days = diffDays(clippedStart, clippedEnd) + 1;
      const x = diffDays(rangeStart, clippedStart) * pxPerDay;
      units.push({
        key: cursor,
        x,
        width: days * pxPerDay,
        label: `S${isoWeek(cursor)}`,
        sublabel: `${formatDayMonth(clippedStart)}`,
        date: cursor,
      });
      unitBoundaries.push(x);
      cursor = addDays(cursor, 7);
    }
  } else {
    let yearStart = startOfMonth(rangeStart);
    yearStart = `${yearStart.slice(0, 4)}-01-01`;
    while (yearStart <= rangeEnd) {
      const yearEnd = `${yearStart.slice(0, 4)}-12-31`;
      const clippedStart = maxDate(yearStart, rangeStart);
      const clippedEnd = minDate(yearEnd, rangeEnd);
      if (clippedStart <= clippedEnd) {
        groups.push({
          key: yearStart,
          x: diffDays(rangeStart, clippedStart) * pxPerDay,
          width: (diffDays(clippedStart, clippedEnd) + 1) * pxPerDay,
          label: yearStart.slice(0, 4),
        });
      }
      yearStart = `${Number(yearStart.slice(0, 4)) + 1}-01-01`;
    }
    let monthStart = startOfMonth(rangeStart);
    while (monthStart <= rangeEnd) {
      const clippedStart = maxDate(monthStart, rangeStart);
      const clippedEnd = minDate(endOfMonth(monthStart), rangeEnd);
      const days = diffDays(clippedStart, clippedEnd) + 1;
      const x = diffDays(rangeStart, clippedStart) * pxPerDay;
      units.push({
        key: monthStart,
        x,
        width: days * pxPerDay,
        label: MONTHS_ES_SHORT[Number(monthStart.slice(5, 7)) - 1],
        sublabel: monthStart.slice(0, 4),
        date: monthStart,
      });
      unitBoundaries.push(x);
      monthStart = addDays(endOfMonth(monthStart), 1);
    }
  }

  const lastUnit = units[units.length - 1];
  unitBoundaries.push(lastUnit ? lastUnit.x + lastUnit.width : width);
  for (const group of groups) groupBoundaries.push(group.x);

  return {
    scale,
    rangeStart,
    rangeEnd,
    totalDays,
    pxPerDay,
    width,
    groups,
    units,
    bands,
    groupBoundaries,
    unitBoundaries,
  };
}

export function dateToX(date: string, layout: GanttLayout): number {
  return diffDays(layout.rangeStart, date) * layout.pxPerDay;
}

export function dateCenterX(date: string, layout: GanttLayout): number {
  return dateToX(date, layout) + layout.pxPerDay / 2;
}

export function activityBar(
  activity: Activity,
  layout: GanttLayout,
): { x: number; width: number; startX: number; endX: number } {
  const x = dateToX(activity.startDate, layout);
  const days = diffDays(activity.startDate, activity.endDate) + 1;
  const width = Math.max(3, days * layout.pxPerDay);
  return { x, width, startX: x, endX: x + width };
}

export function todayMarker(project: Project): { date: string; isReference: boolean } | null {
  if (!project.showToday) return null;
  if (project.referenceDate) return { date: project.referenceDate, isReference: true };
  return { date: todayISO(), isReference: false };
}

export function visibleActivityMap(rows: GanttRow[]): Map<string, ActivityRow> {
  const map = new Map<string, ActivityRow>();
  for (const row of rows) {
    if (row.kind === 'activity') map.set(row.activity.id, row);
  }
  return map;
}

export function dependencyPath(
  predecessor: Activity,
  successor: Activity,
  predecessorRow: ActivityRow,
  successorRow: ActivityRow,
  layout: GanttLayout,
): { path: string; arrowX: number; arrowY: number } {
  const predBar = activityBar(predecessor, layout);
  const succBar = activityBar(successor, layout);
  const y1 = predecessorRow.y + predecessorRow.height / 2;
  const y2 = successorRow.y + successorRow.height / 2;
  const startX = predBar.x + predBar.width;
  const endX = Math.max(succBar.x, 2);
  const gap = 8;

  if (endX > startX + gap * 2) {
    const midX = startX + gap;
    const approachX = endX - gap;
    return {
      path: `M ${startX} ${y1} H ${midX} V ${y2} H ${approachX}`,
      arrowX: endX,
      arrowY: y2,
    };
  }
  // Si la sucesora inicia antes de que termine la predecesora, rodea por abajo.
  const detourY = Math.max(y1, y2) + 16;
  const midX = Math.max(startX, endX) + 10;
  return {
    path: `M ${startX} ${y1} H ${midX} V ${detourY} H ${Math.max(4, endX - 16)} V ${y2} H ${Math.max(2, endX - gap)}`,
    arrowX: endX,
    arrowY: y2,
  };
}

export function fitZoom(scale: GanttScale, layoutRangeDays: number, viewportWidth: number): number {
  const targetPx = Math.max(0.5, viewportWidth / Math.max(1, layoutRangeDays));
  return targetPx / BASE_PX_PER_DAY[scale];
}

export function phaseSpan(activities: Activity[]): { start: string | null; end: string | null } {
  if (!activities.length) return { start: null, end: null };
  const starts = activities.map((activity) => activity.startDate).sort();
  const ends = activities.map((activity) => activity.endDate).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

export function clampActivityDates(
  start: string,
  duration: number,
  calendar: { workingDays: number[]; holidays: string[] },
  unit: 'working_day' | 'calendar_day',
): { start: string; end: string } {
  const end = endDateFromDuration(start, Math.max(0, duration), calendar, unit);
  return { start, end };
}
