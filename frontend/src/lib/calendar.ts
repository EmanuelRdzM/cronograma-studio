import { addDays, diffDays, weekday } from './dates';

export interface CalendarConfig {
  workingDays: number[];
  holidays: string[];
}

export type DurationUnit = 'working_day' | 'calendar_day';

export function isWorkingDay(date: string, calendar: CalendarConfig): boolean {
  return calendar.workingDays.includes(weekday(date)) && !calendar.holidays.includes(date);
}

export function nextWorkingDay(date: string, calendar: CalendarConfig): string {
  let cursor = addDays(date, 1);
  for (let i = 0; i < 400; i += 1) {
    if (isWorkingDay(cursor, calendar)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function addWorkingDaysAfter(date: string, amount: number, calendar: CalendarConfig): string {
  let cursor = date;
  for (let i = 0; i < Math.max(0, amount) + 1; i += 1) cursor = nextWorkingDay(cursor, calendar);
  return cursor;
}

export function snapToWorkingDay(date: string, calendar: CalendarConfig): string {
  let cursor = date;
  for (let i = 0; i < 400; i += 1) {
    if (isWorkingDay(cursor, calendar)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function countWorkingDays(start: string, end: string, calendar: CalendarConfig): number {
  if (end < start) return 0;
  const total = diffDays(start, end);
  if (total > 20_000) return 0;
  let count = 0;
  for (let i = 0; i <= total; i += 1) {
    if (isWorkingDay(addDays(start, i), calendar)) count += 1;
  }
  return count;
}

export function countDuration(start: string, end: string, calendar: CalendarConfig, unit: DurationUnit): number {
  if (unit === 'calendar_day') return end < start ? 0 : diffDays(start, end) + 1;
  return countWorkingDays(start, end, calendar);
}

export function endDateFromDuration(
  start: string,
  duration: number,
  calendar: CalendarConfig,
  unit: DurationUnit,
): string {
  if (duration <= 0) return start;
  if (unit === 'calendar_day') return addDays(start, duration - 1);
  let cursor = start;
  let remaining = duration;
  for (let i = 0; i < 400; i += 1) {
    if (isWorkingDay(cursor, calendar)) {
      remaining -= 1;
      if (remaining <= 0) return cursor;
    }
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function calendarFromProject(project: { workingDays: number[]; holidays: string[] }): CalendarConfig {
  return { workingDays: project.workingDays, holidays: project.holidays };
}
