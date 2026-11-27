import {
  CalendarConfig,
  addWorkingDaysAfter,
  endDateFromDuration,
  isWorkingDay,
} from './calendar.js';
import { isISODate, todayISO } from './dates.js';

export interface PlantUmlActivity {
  name: string;
  phaseIndex: number | null;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  color: string | null;
  predecessorNames: string[];
  line: number;
}

export interface PlantUmlPhase {
  name: string;
  activities: PlantUmlActivity[];
}

export interface PlantUmlWarning {
  line: number | null;
  message: string;
}

export interface PlantUmlParseResult {
  title: string;
  projectStart: string;
  defaultScale: 'day' | 'week' | 'month';
  workingDays: number[];
  referenceDate: string | null;
  phases: PlantUmlPhase[];
  activities: PlantUmlActivity[];
  dependencies: { predecessorName: string; successorName: string }[];
  warnings: PlantUmlWarning[];
  errors: PlantUmlWarning[];
  summary: {
    phases: number;
    activities: number;
    dependencies: number;
    warnings: number;
    errors: number;
  };
}

interface TempActivity {
  name: string;
  phaseIndex: number | null;
  explicitStart: string | null;
  predecessorName: string | null;
  duration: number | null;
  progress: number;
  color: string | null;
  line: number;
  duplicate: boolean;
}

const COLOR_NAMES: Record<string, string> = {
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  orange: '#FFA500',
  yellow: '#FFFF00',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  grey: '#808080',
  purple: '#800080',
  pink: '#FFC0CB',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  brown: '#A52A2A',
  lime: '#00FF00',
  navy: '#000080',
  teal: '#008080',
};

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalizeColor(value: string): string | null {
  const trimmed = value.trim().replace(/[;.]$/, '');
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, a, b, c] = trimmed;
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase();
  }
  return COLOR_NAMES[trimmed.toLowerCase()] ?? null;
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Parser controlado del subconjunto PlantUML Gantt documentado.
 * No ejecuta código ni interpreta HTML.
 */
export function parsePlantUml(text: string): PlantUmlParseResult {
  const warnings: PlantUmlWarning[] = [];
  const errors: PlantUmlWarning[] = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);

  let title = 'Cronograma importado';
  let projectStart: string | null = null;
  let defaultScale: 'day' | 'week' | 'month' = 'day';
  let workingDays = [1, 2, 3, 4, 5];
  let referenceDate: string | null = null;
  let inStyle = false;
  let styleWarned = false;
  let inGantt = false;
  let sawGantt = false;

  const tempActivities = new Map<string, TempActivity>();
  const order: string[] = [];
  const phaseNames: string[] = [];
  let currentPhaseIndex: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) continue;

    if (inStyle) {
      if (line.toLowerCase().includes('</style>')) inStyle = false;
      continue;
    }
    if (line.toLowerCase().startsWith('<style')) {
      inStyle = true;
      if (!styleWarned) {
        warnings.push({
          line: lineNumber,
          message: 'Se ignoraron los estilos personalizados de PlantUML; la aplicación usa su propio diseño.',
        });
        styleWarned = true;
      }
      continue;
    }
    if (line.startsWith('@startgantt')) {
      inGantt = true;
      sawGantt = true;
      continue;
    }
    if (line.startsWith('@endgantt')) {
      inGantt = false;
      continue;
    }
    if (line.startsWith("'") || line.startsWith('//')) continue;

    const phaseMatch = line.match(/^--\s*(.*?)\s*--$/);
    if (phaseMatch) {
      const name = cleanName(phaseMatch[1]) || `Fase ${phaseNames.length + 1}`;
      phaseNames.push(name);
      currentPhaseIndex = phaseNames.length - 1;
      continue;
    }

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title = cleanName(titleMatch[1]);
      continue;
    }

    const projectStartMatch = line.match(/^Project starts\s+(\d{4}-\d{2}-\d{2})$/i);
    if (projectStartMatch) {
      if (isISODate(projectStartMatch[1])) projectStart = projectStartMatch[1];
      else errors.push({ line: lineNumber, message: `Fecha de inicio inválida: ${projectStartMatch[1]}` });
      continue;
    }

    const scaleMatch = line.match(/^projectscale\s+(daily|weekly|monthly)$/i);
    if (scaleMatch) {
      defaultScale = scaleMatch[1].toLowerCase() === 'daily'
        ? 'day'
        : scaleMatch[1].toLowerCase() === 'weekly'
          ? 'week'
          : 'month';
      continue;
    }

    const languageMatch = line.match(/^language\s+(\w+)$/i);
    if (languageMatch) {
      if (languageMatch[1].toLowerCase() !== 'es') {
        warnings.push({ line: lineNumber, message: `Idioma "${languageMatch[1]}" no soportado; se usará español.` });
      }
      continue;
    }

    const todayMatch = line.match(/^today is\s+(\d{4}-\d{2}-\d{2})/i);
    if (todayMatch) {
      referenceDate = todayMatch[1];
      warnings.push({
        line: lineNumber,
        message: 'La fecha "today" se guardó como fecha de referencia. Puedes cambiarla o quitarla en Ajustes del proyecto.',
      });
      continue;
    }

    const closedMatch = line.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:are|is)\s+(closed|open)$/i);
    if (closedMatch) {
      const day = WEEKDAY_NAMES[closedMatch[1].toLowerCase()];
      if (closedMatch[2].toLowerCase() === 'closed') {
        workingDays = workingDays.filter((item) => item !== day);
      } else if (!workingDays.includes(day)) {
        workingDays.push(day);
        workingDays.sort((a, b) => a - b);
      }
      continue;
    }

    const activityMatch = line.match(/^\[(.+?)\]\s+(.+)$/);
    if (activityMatch) {
      const name = cleanName(activityMatch[1]);
      const directive = activityMatch[2].trim();
      let temp = tempActivities.get(name);
      if (!temp) {
        temp = {
          name,
          phaseIndex: currentPhaseIndex,
          explicitStart: null,
          predecessorName: null,
          duration: null,
          progress: 0,
          color: null,
          line: lineNumber,
          duplicate: false,
        };
        tempActivities.set(name, temp);
        order.push(name);
      } else if (temp.phaseIndex !== currentPhaseIndex) {
        temp.duplicate = true;
      }

      const startsAtMatch = directive.match(/^starts at\s+\[(.+?)\]'s end$/i);
      if (startsAtMatch) {
        temp.predecessorName = cleanName(startsAtMatch[1]);
        continue;
      }
      if (/^starts at\s+/i.test(directive)) {
        warnings.push({
          line: lineNumber,
          message: `Solo se admite la dependencia "starts at [actividad]'s end". Se ignoró: ${directive}`,
        });
        continue;
      }
      const startsMatch = directive.match(/^starts\s+(\d{4}-\d{2}-\d{2})$/i);
      if (startsMatch) {
        if (isISODate(startsMatch[1])) temp.explicitStart = startsMatch[1];
        else errors.push({ line: lineNumber, message: `Fecha inválida: ${startsMatch[1]}` });
        continue;
      }
      const lastsMatch = directive.match(/^lasts\s+(\d+)\s+days?$/i);
      if (lastsMatch) {
        temp.duration = Math.max(0, Number(lastsMatch[1]));
        continue;
      }
      const progressMatch = directive.match(/^is\s+(\d+)%\s+completed$/i);
      if (progressMatch) {
        const value = Number(progressMatch[1]);
        if (value < 0 || value > 100) {
          warnings.push({ line: lineNumber, message: `Avance fuera de rango (${value}%); se ajustó a 0–100.` });
        }
        temp.progress = Math.min(100, Math.max(0, value));
        continue;
      }
      const colorMatch = directive.match(/^is colored in\s+(.+)$/i);
      if (colorMatch) {
        temp.color = normalizeColor(colorMatch[1]);
        if (!temp.color) {
          warnings.push({ line: lineNumber, message: `Color no reconocido: ${colorMatch[1]}` });
        }
        continue;
      }
      if (/\b(happens|milestone)\b/i.test(directive)) {
        warnings.push({ line: lineNumber, message: `Hitos no soportados en esta importación: ${directive}` });
        continue;
      }
      warnings.push({ line: lineNumber, message: `Instrucción no soportada para "${name}": ${directive}` });
      continue;
    }

    if (!inGantt && sawGantt) {
      warnings.push({ line: lineNumber, message: `Línea fuera del bloque @startgantt/@endgantt: ${line}` });
    } else {
      warnings.push({ line: lineNumber, message: `Línea no interpretada: ${line}` });
    }
  }

  for (const temp of tempActivities.values()) {
    if (temp.duplicate) {
      warnings.push({
        line: temp.line,
        message: `La actividad "${temp.name}" aparece en más de una sección; se conservó en la primera.`,
      });
    }
    if (temp.duration === null) {
      temp.duration = 1;
      warnings.push({ line: temp.line, message: `"${temp.name}" no declara duración; se usó 1 día.` });
    }
    if (temp.explicitStart && temp.predecessorName) {
      warnings.push({
        line: temp.line,
        message: `"${temp.name}" declara inicio y dependencia; se respetó la fecha explícita y se conservó la dependencia.`,
      });
    }
  }

  if (!sawGantt) {
    errors.push({ line: 1, message: 'No se encontró un bloque @startgantt ... @endgantt.' });
  }
  if (tempActivities.size === 0) {
    errors.push({ line: null, message: 'No se encontraron actividades en el código PlantUML.' });
  }
  if (workingDays.length === 0) {
    warnings.push({ line: null, message: 'El calendario quedó sin días laborables; se usarán lunes a viernes.' });
    workingDays = [1, 2, 3, 4, 5];
  }

  const calendar: CalendarConfig = { workingDays, holidays: [] };
  const startBase = projectStart ?? todayISO();

  // Resolver fechas en cadena, sin importar el orden de las líneas.
  const resolved = new Map<string, { start: string; end: string }>();
  const unresolved = new Set(order);
  let guard = 0;
  while (unresolved.size > 0 && guard < order.length * 3 + 5) {
    guard += 1;
    let progressed = false;
    for (const name of Array.from(unresolved)) {
      const temp = tempActivities.get(name)!;
      let start: string | null = null;
      if (temp.explicitStart) {
        start = temp.explicitStart;
      } else if (temp.predecessorName) {
        const predecessor = resolved.get(temp.predecessorName);
        if (!predecessor) {
          if (!tempActivities.has(temp.predecessorName)) {
            warnings.push({
              line: temp.line,
              message: `No se encontró la actividad predecesora "${temp.predecessorName}" de "${name}"; se usó la fecha del proyecto.`,
            });
            start = startBase;
          } else {
            continue; // quizá se resuelve más adelante
          }
        } else {
          start = addWorkingDaysAfter(predecessor.end, 0, calendar);
        }
      } else {
        start = startBase;
        warnings.push({
          line: temp.line,
          message: `"${name}" no declara inicio; se usó la fecha de inicio del proyecto (${startBase}).`,
        });
      }
      if (!start) continue;
      if (!isWorkingDay(start, calendar)) {
        warnings.push({
          line: temp.line,
          message: `"${name}" inicia en un día no laborable (${start}); la duración se cuenta desde el siguiente día laborable.`,
        });
      }
      const duration = Math.max(0, temp.duration ?? 1);
      const end = endDateFromDuration(start, duration, calendar, 'working_day');
      resolved.set(name, { start, end });
      unresolved.delete(name);
      progressed = true;
    }
    if (!progressed) {
      for (const name of unresolved) {
        const temp = tempActivities.get(name)!;
        const start = temp.explicitStart ?? startBase;
        resolved.set(name, { start, end: endDateFromDuration(start, Math.max(0, temp.duration ?? 1), calendar, 'working_day') });
        warnings.push({
          line: temp.line,
          message: `No se pudo resolver la dependencia de "${name}"; se usó ${start}.`,
        });
      }
      unresolved.clear();
    }
  }

  const activities: PlantUmlActivity[] = order.map((name) => {
    const temp = tempActivities.get(name)!;
    const dates = resolved.get(name)!;
    return {
      name,
      phaseIndex: temp.phaseIndex,
      startDate: dates.start,
      endDate: dates.end,
      duration: Math.max(0, temp.duration ?? 1),
      progress: temp.progress,
      color: temp.color,
      predecessorNames: temp.predecessorName ? [temp.predecessorName] : [],
      line: temp.line,
    };
  });

  const dependencies: { predecessorName: string; successorName: string }[] = [];
  for (const activity of activities) {
    for (const predecessorName of activity.predecessorNames) {
      if (tempActivities.has(predecessorName)) {
        dependencies.push({ predecessorName, successorName: activity.name });
      }
    }
  }

  const phases: PlantUmlPhase[] = phaseNames.map((name) => ({ name, activities: [] }));
  for (const activity of activities) {
    if (activity.phaseIndex !== null && phases[activity.phaseIndex]) {
      phases[activity.phaseIndex].activities.push(activity);
    }
  }

  const minActivityStart = activities.map((activity) => activity.startDate).sort()[0];
  const finalStart = projectStart ?? minActivityStart ?? todayISO();

  return {
    title,
    projectStart: finalStart,
    defaultScale,
    workingDays,
    referenceDate,
    phases,
    activities,
    dependencies,
    warnings,
    errors,
    summary: {
      phases: phases.length,
      activities: activities.length,
      dependencies: dependencies.length,
      warnings: warnings.length,
      errors: errors.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Exportación
// ---------------------------------------------------------------------------

interface ExportPhase { id: string; name: string; sortOrder: number }
interface ExportActivity {
  id: string;
  phaseId: string | null;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  color: string | null;
  sortOrder: number;
}
interface ExportDependency {
  predecessorId: string;
  successorId: string;
  type: string;
  lag: number;
}
interface ExportProject {
  name: string;
  startDate: string;
  workingDays: number[];
  defaultScale: string;
  referenceDate: string | null;
}
export interface PlantUmlExportInput {
  project: ExportProject;
  phases: ExportPhase[];
  activities: ExportActivity[];
  dependencies: ExportDependency[];
}

const WEEKDAY_OUT: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function safeName(name: string): string {
  return name.replace(/[\[\]\r\n]/g, (character) => (character === '\n' || character === '\r' ? ' ' : ')'));
}

function durationLine(duration: number): string {
  const safeDuration = Math.max(1, duration);
  return `lasts ${safeDuration} ${safeDuration === 1 ? 'day' : 'days'}`;
}

export function exportPlantUml(input: PlantUmlExportInput): { code: string; warnings: string[] } {
  const warnings: string[] = [];
  const lines: string[] = [
    '@startgantt',
    '<style>',
    'ganttDiagram {',
    '  task {',
    '    FontName SansSerif',
    '    FontSize 11',
    '    FontColor black',
    '    FontStyle plain',
    '    BackGroundColor #ADD1B2',
    '    LineColor black',
    '  }',
    '}',
    '</style>',
    'language es',
    `title ${input.project.name.replace(/[\r\n]/g, ' ')}`,
    `Project starts ${input.project.startDate}`,
    `projectscale ${input.project.defaultScale === 'week' ? 'weekly' : input.project.defaultScale === 'month' ? 'monthly' : 'daily'}`,
  ];

  for (const day of [0, 1, 2, 3, 4, 5, 6]) {
    if (!input.project.workingDays.includes(day)) {
      lines.push(`${WEEKDAY_OUT[day]} are closed`);
    }
  }
  if (input.project.referenceDate) {
    lines.push(`today is ${input.project.referenceDate} and is colored in orange`);
  }
  lines.push('');

  const activityById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const incoming = new Map<string, ExportDependency[]>();
  for (const dependency of input.dependencies) {
    if (dependency.type !== 'FS') {
      warnings.push(
        `La dependencia ${activityById.get(dependency.predecessorId)?.name ?? dependency.predecessorId} → ${activityById.get(dependency.successorId)?.name ?? dependency.successorId} (${dependency.type}) no tiene sintaxis implementada; se exportaron fechas explícitas.`,
      );
      continue;
    }
    const list = incoming.get(dependency.successorId) ?? [];
    list.push(dependency);
    incoming.set(dependency.successorId, list);
  }

  const phases = [...input.phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const phaseIds = new Set(phases.map((phase) => phase.id));
  const groups: { name: string; activities: ExportActivity[] }[] = phases.map((phase) => ({
    name: phase.name,
    activities: [],
  }));
  const noPhase: ExportActivity[] = [];
  const sortedActivities = [...input.activities].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const activity of sortedActivities) {
    if (!activity.phaseId || !phaseIds.has(activity.phaseId)) {
      noPhase.push(activity);
    } else {
      const phaseIndex = phases.findIndex((phase) => phase.id === activity.phaseId);
      groups[phaseIndex].activities.push(activity);
    }
  }

  const writeActivity = (activity: ExportActivity) => {
    const name = safeName(activity.name);
    const dependencies = incoming.get(activity.id) ?? [];
    if (activity.type === 'milestone') {
      lines.push(`[${name}] happens on ${activity.startDate}`);
      if (activity.progress > 0) lines.push(`[${name}] is ${activity.progress}% completed`);
      return;
    }
    let usedDependencySyntax = false;
    if (dependencies.length === 1) {
      const dependency = dependencies[0];
      const predecessor = activityById.get(dependency.predecessorId);
      if (predecessor) {
        const expectedStart = addWorkingDaysAfter(predecessor.endDate, dependency.lag, {
          workingDays: input.project.workingDays,
          holidays: [],
        });
        if (expectedStart === activity.startDate) {
          lines.push(`[${name}] starts at [${safeName(predecessor.name)}]'s end`);
          usedDependencySyntax = true;
        }
      }
    }
    if (!usedDependencySyntax) {
      lines.push(`[${name}] starts ${activity.startDate}`);
      for (const dependency of dependencies) {
        const predecessor = activityById.get(dependency.predecessorId);
        if (predecessor) {
          const lagText = dependency.lag ? `, +${dependency.lag} días` : '';
          lines.push(`' Dependencia FS: [${safeName(predecessor.name)}] → [${name}]${lagText}`);
        }
      }
    }
    lines.push(`[${name}] ${durationLine(activity.duration)}`);
    if (activity.progress > 0) lines.push(`[${name}] is ${activity.progress}% completed`);
    if (activity.color) lines.push(`[${name}] is colored in ${activity.color}`);
    lines.push('');
  };

  for (const group of groups) {
    lines.push(`-- ${group.name.replace(/[\r\n]/g, ' ')} --`);
    for (const activity of group.activities) writeActivity(activity);
  }
  if (noPhase.length) {
    lines.push('-- Sin fase --');
    for (const activity of noPhase) writeActivity(activity);
  }
  lines.push('@endgantt');
  return { code: lines.join('\n'), warnings };
}

/** Utilidad para precargar datos de importación en el frontend. */
export function importAssets(result: PlantUmlParseResult) {
  return {
    title: result.title,
    activities: result.activities,
    phases: result.phases,
    warnings: result.warnings,
    errors: result.errors,
  };
}
