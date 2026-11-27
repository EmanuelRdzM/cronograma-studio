import { describe, expect, it } from 'vitest';
import { exportPlantUml, parsePlantUml } from './plantuml.js';

const SAMPLE = `@startgantt
<style>
ganttDiagram { task { BackGroundColor #ADD1B2 } }
</style>
language es
title Demo de importación
Project starts 2026-10-05
projectscale daily
saturday are closed
sunday are closed

-- Fase 1 - Base --
[A] starts 2026-10-09
[A] lasts 3 days
[A] is 50% completed
[A] is colored in #FF0000

[B] starts at [A]'s end
[B] lasts 2 days

-- Fase 2 - Entrega --
[C] starts 2026-10-20
[C] lasts 1 day

today is 2026-11-06 and is colored in orange
@endgantt`;

describe('parser PlantUML', () => {
  it('detecta fases, actividades, fechas, colores y dependencias', () => {
    const parsed = parsePlantUml(SAMPLE);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.phases).toHaveLength(2);
    expect(parsed.activities).toHaveLength(3);
    expect(parsed.dependencies).toEqual([{ predecessorName: 'A', successorName: 'B' }]);
    expect(parsed.referenceDate).toBe('2026-11-06');

    const activityA = parsed.activities.find((activity) => activity.name === 'A');
    const activityB = parsed.activities.find((activity) => activity.name === 'B');
    expect(activityA).toMatchObject({
      startDate: '2026-10-09',
      endDate: '2026-10-13',
      duration: 3,
      progress: 50,
      color: '#FF0000',
    });
    expect(activityB).toMatchObject({
      startDate: '2026-10-14',
      endDate: '2026-10-15',
      duration: 2,
    });
  });

  it('reporta construcciones no soportadas sin descartarlas en silencio', () => {
    const parsed = parsePlantUml(`${SAMPLE}\n[Z] is a strange thing` );
    expect(parsed.warnings.some((warning) => warning.message.includes('no soportada'))).toBe(true);
    expect(parsed.warnings.some((warning) => warning.message.includes('estilos personalizados'))).toBe(true);
  });

  it('exporta y vuelve a importar el mismo conjunto de actividades', () => {
    const exported = exportPlantUml({
      project: {
        name: 'Proyecto exportado',
        startDate: '2026-10-05',
        workingDays: [1, 2, 3, 4, 5],
        defaultScale: 'day',
        referenceDate: '2026-11-06',
      },
      phases: [
        { id: 'p1', name: 'Fase 1', sortOrder: 0 },
        { id: 'p2', name: 'Fase 2', sortOrder: 1 },
      ],
      activities: [
        {
          id: 'a', phaseId: 'p1', name: 'A', type: 'task', startDate: '2026-10-09',
          endDate: '2026-10-13', duration: 3, progress: 50, color: '#FF0000', sortOrder: 0,
        },
        {
          id: 'b', phaseId: 'p1', name: 'B', type: 'task', startDate: '2026-10-14',
          endDate: '2026-10-15', duration: 2, progress: 0, color: null, sortOrder: 1,
        },
        {
          id: 'c', phaseId: 'p2', name: 'C', type: 'task', startDate: '2026-10-20',
          endDate: '2026-10-20', duration: 1, progress: 100, color: null, sortOrder: 2,
        },
      ],
      dependencies: [
        { predecessorId: 'a', successorId: 'b', type: 'FS', lag: 0 },
      ],
    });
    expect(exported.code).toContain('[B] starts at [A]\'s end');
    expect(exported.code).toContain('[A] is 50% completed');
    expect(exported.code).toContain('[A] is colored in #FF0000');
    expect(exported.code).toContain('saturday are closed');
    expect(exported.code).toContain('sunday are closed');

    const reparsed = parsePlantUml(exported.code);
    expect(reparsed.errors).toHaveLength(0);
    expect(reparsed.activities).toHaveLength(3);
    expect(reparsed.dependencies).toHaveLength(1);
    const reparsedB = reparsed.activities.find((activity) => activity.name === 'B');
    expect(reparsedB?.startDate).toBe('2026-10-14');
    expect(reparsedB?.endDate).toBe('2026-10-15');
  });
});
