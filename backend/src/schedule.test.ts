import { describe, expect, it } from 'vitest';
import {
  computeScheduleUpdates,
  wouldCreateCycle,
  type ScheduleActivity,
  type ScheduleDependency,
} from './schedule.js';

const calendar = { workingDays: [1, 2, 3, 4, 5], holidays: [] };

function activities(): ScheduleActivity[] {
  return [
    { id: 'a', type: 'task', startDate: '2026-10-05', endDate: '2026-10-06', duration: 2, durationUnit: 'working_day' },
    { id: 'b', type: 'task', startDate: '2026-10-20', endDate: '2026-10-21', duration: 2, durationUnit: 'working_day' },
    { id: 'c', type: 'task', startDate: '2026-10-25', endDate: '2026-10-25', duration: 1, durationUnit: 'working_day' },
  ];
}

const dependencies: ScheduleDependency[] = [
  { predecessorId: 'a', successorId: 'b', type: 'FS', lag: 0 },
  { predecessorId: 'b', successorId: 'c', type: 'FS', lag: 0 },
];

describe('programación de dependencias', () => {
  it('recalcula todas las sucesoras desde cero', () => {
    const updates = computeScheduleUpdates(activities(), dependencies, calendar);
    const byId = Object.fromEntries(updates.map((update) => [update.id, update]));
    expect(byId.b.startDate).toBe('2026-10-07');
    expect(byId.b.endDate).toBe('2026-10-08');
    expect(byId.c.startDate).toBe('2026-10-09');
    expect(byId.c.endDate).toBe('2026-10-09');
  });

  it('al mover una actividad solo mueve a sus descendientes', () => {
    const list = activities();
    list[0] = { ...list[0], startDate: '2026-10-12', endDate: '2026-10-13' };
    const updates = computeScheduleUpdates(list, dependencies, calendar, 'a');
    const byId = Object.fromEntries(updates.map((update) => [update.id, update]));
    expect(byId.b?.startDate).toBe('2026-10-14');
    expect(byId.c?.startDate).toBe('2026-10-16');
    // La actividad ancla no se modifica.
    expect(byId.a).toBeUndefined();
  });

  it('respeta el retraso (lag)', () => {
    const list = activities();
    const withLag: ScheduleDependency[] = [
      { predecessorId: 'a', successorId: 'b', type: 'FS', lag: 2 },
    ];
    const updates = computeScheduleUpdates(list, withLag, calendar);
    expect(updates.find((update) => update.id === 'b')?.startDate).toBe('2026-10-09');
  });

  it('detecta ciclos', () => {
    expect(wouldCreateCycle(dependencies, 'c', 'a')).toBe(true);
    expect(wouldCreateCycle(dependencies, 'a', 'c')).toBe(false);
    expect(wouldCreateCycle([], 'a', 'a')).toBe(true);
  });

  it('mantiene hitos en una sola fecha', () => {
    const list: ScheduleActivity[] = [
      { id: 'a', type: 'task', startDate: '2026-10-05', endDate: '2026-10-06', duration: 2, durationUnit: 'working_day' },
      { id: 'm', type: 'milestone', startDate: '2026-10-20', endDate: '2026-10-20', duration: 0, durationUnit: 'working_day' },
    ];
    const updates = computeScheduleUpdates(
      list,
      [{ predecessorId: 'a', successorId: 'm', type: 'FS', lag: 0 }],
      calendar,
    );
    expect(updates.find((update) => update.id === 'm')).toMatchObject({
      startDate: '2026-10-07',
      endDate: '2026-10-07',
      duration: 0,
    });
  });
});
