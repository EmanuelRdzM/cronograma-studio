import { describe, expect, it } from 'vitest';
import {
  countDuration,
  countWorkingDays,
  endDateFromDuration,
  isWorkingDay,
  nextWorkingDay,
  snapToWorkingDay,
} from './calendar.js';

const calendar = { workingDays: [1, 2, 3, 4, 5], holidays: [] };

describe('calendario laboral', () => {
  it('cuenta días laborables inclusivos y salta fines de semana', () => {
    expect(countWorkingDays('2026-10-09', '2026-10-13', calendar)).toBe(3);
    expect(countWorkingDays('2026-10-09', '2026-10-09', calendar)).toBe(1);
    expect(countWorkingDays('2026-10-10', '2026-10-11', calendar)).toBe(0);
  });

  it('calcula el fin desde la duración', () => {
    expect(endDateFromDuration('2026-10-09', 3, calendar, 'working_day')).toBe('2026-10-13');
    expect(endDateFromDuration('2026-10-09', 1, calendar, 'working_day')).toBe('2026-10-09');
    expect(endDateFromDuration('2026-10-09', 5, calendar, 'calendar_day')).toBe('2026-10-13');
  });

  it('respeta festivos', () => {
    const withHoliday = { ...calendar, holidays: ['2026-10-12'] };
    expect(isWorkingDay('2026-10-12', withHoliday)).toBe(false);
    expect(endDateFromDuration('2026-10-09', 3, withHoliday, 'working_day')).toBe('2026-10-14');
  });

  it('encuentra el siguiente día laborable', () => {
    expect(nextWorkingDay('2026-10-08', calendar)).toBe('2026-10-09');
    expect(nextWorkingDay('2026-10-09', calendar)).toBe('2026-10-12');
    expect(snapToWorkingDay('2026-10-10', calendar)).toBe('2026-10-12');
  });

  it('cuenta duraciones en días naturales', () => {
    expect(countDuration('2026-10-09', '2026-10-13', calendar, 'calendar_day')).toBe(5);
    expect(countDuration('2026-10-09', '2026-10-13', calendar, 'working_day')).toBe(3);
  });
});
