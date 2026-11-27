import { prisma } from './db.js';
import { HttpError } from './http.js';
import { parsePlantUml } from './plantuml.js';
import { serializeWorkingDays } from './calendar.js';
import { syncProjectEnd, getProjectBundle } from './projectService.js';

export function previewPlantUml(text: string) {
  if (!text.trim()) throw new HttpError(400, 'Pega el código PlantUML para analizarlo', 'EMPTY_IMPORT');
  if (text.length > 500_000) throw new HttpError(400, 'El archivo supera el límite de 500 KB', 'IMPORT_TOO_LARGE');
  const parsed = parsePlantUml(text);
  return parsed;
}

export async function createProjectFromPlantUml(userId: string, text: string, nameOverride?: string) {
  const parsed = previewPlantUml(text);
  if (parsed.errors.length > 0) {
    throw new HttpError(400, 'El código PlantUML tiene errores', 'IMPORT_ERRORS', parsed.errors);
  }
  if (parsed.activities.length === 0) {
    throw new HttpError(400, 'No se encontraron actividades para importar', 'EMPTY_IMPORT');
  }
  const name = (nameOverride?.trim() || parsed.title || 'Cronograma importado').slice(0, 160);

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
      description: 'Importado desde PlantUML',
      status: 'planning',
      color: '#4F46E5',
      startDate: parsed.projectStart,
      timezone: 'America/Mexico_City',
      schedulingMode: 'manual',
      workingDays: serializeWorkingDays(parsed.workingDays),
      holidays: '[]',
      showToday: true,
      referenceDate: parsed.referenceDate,
      defaultScale: parsed.defaultScale,
      sourcePlantUml: text,
    },
  });

  const phaseIds: string[] = [];
  for (let index = 0; index < parsed.phases.length; index += 1) {
    const phase = await prisma.phase.create({
      data: { projectId: project.id, name: parsed.phases[index].name, sortOrder: index },
    });
    phaseIds.push(phase.id);
  }

  const activityIds = new Map<string, string>();
  const allActivities = parsed.activities;
  for (let index = 0; index < allActivities.length; index += 1) {
    const activity = allActivities[index];
    const created = await prisma.activity.create({
      data: {
        projectId: project.id,
        phaseId: activity.phaseIndex !== null ? phaseIds[activity.phaseIndex] ?? null : null,
        name: activity.name.slice(0, 240),
        type: 'task',
        startDate: activity.startDate,
        endDate: activity.endDate,
        duration: activity.duration,
        durationUnit: 'working_day',
        progress: activity.progress,
        status: activity.progress >= 100 ? 'completed' : activity.progress > 0 ? 'in_progress' : 'pending',
        priority: 'medium',
        color: activity.color,
        sortOrder: index,
      },
    });
    activityIds.set(activity.name, created.id);
  }

  for (const dependency of parsed.dependencies) {
    const predecessorId = activityIds.get(dependency.predecessorName);
    const successorId = activityIds.get(dependency.successorName);
    if (predecessorId && successorId) {
      await prisma.dependency.create({
        data: {
          projectId: project.id,
          predecessorId,
          successorId,
          type: 'FS',
          lag: 0,
        },
      });
    }
  }

  await syncProjectEnd(project.id);
  return getProjectBundle(project.id, userId);
}
