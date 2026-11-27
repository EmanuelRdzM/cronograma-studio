import { addDays, diffDays, weekday } from './dates.js';

export interface CalendarConfig {
  workingDays: number[]; // 0 domingo ... 6 sábado
  holidays: string[];    // YYYY-MM-DD
}

export type DurationUnit = 'working_day' | 'calendar_day';

export function parseWorkingDays(value: string): number[] {
  const days = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

export function serializeWorkingDays(days: number[]): string {
  return Array.from(new Set(days))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    .sort((a, b) => a - b)
    .join(',');
}

export function parseHolidays(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function isWorkingDay(date: string, calendar: CalendarConfig): boolean {
  return calendar.workingDays.includes(weekday(date)) && !calendar.holidays.includes(date);
}

/** Siguiente día laborable estrictamente posterior a `date`. */
export function nextWorkingDay(date: string, calendar: CalendarConfig): string {
  let cursor = addDays(date, 1);
  for (let i = 0; i < 400; i += 1) {
    if (isWorkingDay(cursor, calendar)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor; // configuración inválida (sin días laborables); emergencia
}

/** Avanza N días laborables después de `date` (0 = siguiente día laborable). */
export function addWorkingDaysAfter(date: string, amount: number, calendar: CalendarConfig): string {
  let cursor = date;
  const steps = Math.max(0, amount) + 1;
  for (let i = 0; i < steps; i += 1) cursor = nextWorkingDay(cursor, calendar);
  return cursor;
}

/** Siguiente día laborable, incluyendo `date` si ya es laborable. */
export function snapToWorkingDay(date: string, calendar: CalendarConfig): string {
  let cursor = date;
  for (let i = 0; i < 400; i += 1) {
    if (isWorkingDay(cursor, calendar)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/** Cuenta días laborables inclusivos. Devuelve 1 mínimo si las fechas son válidas. */
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

export function countCalendarDays(start: string, end: string): number {
  if (end < start) return 0;
  return diffDays(start, end) + 1;
}

export function countDuration(start: string, end: string, calendar: CalendarConfig, unit: DurationUnit): number {
  return unit === 'calendar_day' ? countCalendarDays(start, end) : countWorkingDays(start, end, calendar);
}

/**
 * Calcula la fecha final inclusiva a partir de una duración.
 * La duración mínima es 1. Para hitos se usa 0 y devuelve la misma fecha.
 */
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
  // Si el inicio cae en día no laborable, se recorre al primer día laborable.
  for (let i = 0; i < 400; i += 1) {
    if (isWorkingDay(cursor, calendar)) {
      remaining -= 1;
      if (remaining <= 0) return cursor;
    }
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/** Valida que la configuración del calendario tenga al menos un día laborable. */
export function hasWorkingDay(calendar: CalendarConfig): boolean {
  return calendar.workingDays.length > 0;
}
