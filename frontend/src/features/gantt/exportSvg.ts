import type { Activity, Dependency, GanttScale, Phase, Project } from '@/api/types';
import {
  ACTIVITY_STATUS,
  phaseColor,
} from '@/lib/labels';
import {
  MONTHS_ES,
  formatDateRange,
  formatShortDate,
  formatLongDate,
  todayISO,
  WEEKDAYS_ES_SHORT,
} from '@/lib/dates';
import {
  ACTIVITY_ROW_HEIGHT,
  HEADER_HEIGHT,
  PHASE_ROW_HEIGHT,
  activityBar,
  buildLayout,
  buildPhaseGroups,
  buildRows,
  dateCenterX,
  dependencyPath,
  todayMarker,
  visibleActivityMap,
  type ActivityRow,
} from './layout';

const MARGIN = 28;
const LEFT_WIDTH = 560;
const TITLE_HEIGHT = 76;
const LEGEND_HEIGHT = 34;
const FOOTER_HEIGHT = 26;
const FONT = 'Inter, Segoe UI, Arial, sans-serif';

export interface ExportOptions {
  scale: GanttScale;
  includeTitle?: boolean;
  includeLegend?: boolean;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, maxWidth: number, fontSize: number): string {
  const maxChars = Math.max(3, Math.floor(maxWidth / (fontSize * 0.56)));
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1)}…`;
}

function svgText(
  x: number,
  y: number,
  content: string,
  options: {
    size?: number;
    weight?: number | string;
    fill?: string;
    anchor?: 'start' | 'middle' | 'end';
    family?: string;
    opacity?: number;
    letterSpacing?: number;
  } = {},
): string {
  const {
    size = 10,
    weight = 400,
    fill = '#334155',
    anchor = 'start',
    family = FONT,
    opacity = 1,
    letterSpacing,
  } = options;
  return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${opacity !== 1 ? ` opacity="${opacity}"` : ''}${letterSpacing ? ` letter-spacing="${letterSpacing}"` : ''}>${escapeXml(content)}</text>`;
}

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  options: { rx?: number; stroke?: string; strokeWidth?: number; opacity?: number } = {},
): string {
  const { rx = 0, stroke, strokeWidth = 1, opacity = 1 } = options;
  return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(0, width).toFixed(2)}" height="${Math.max(0, height).toFixed(2)}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : ''}${opacity !== 1 ? ` opacity="${opacity}"` : ''}/>`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1, dash?: string): string {
  return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

export interface ExportResult {
  svg: string;
  width: number;
  height: number;
}

export function buildExportSvg(
  bundle: {
    project: Project;
    phases: Phase[];
    activities: Activity[];
    dependencies: Dependency[];
  },
  options: ExportOptions,
): ExportResult {
  const { project, phases, activities, dependencies } = bundle;
  const includeTitle = options.includeTitle !== false;
  const includeLegend = options.includeLegend !== false;
  const allGroups = buildPhaseGroups(phases, activities, new Set(), {});
  const rows = buildRows(allGroups);
  const layout = buildLayout(project, activities, options.scale, 1);
  const rowAreaHeight = rows.length
    ? rows[rows.length - 1].y + rows[rows.length - 1].height
    : 120;
  const titleHeight = includeTitle ? TITLE_HEIGHT : 14;
  const headerY = MARGIN + titleHeight;
  const bodyY = headerY + HEADER_HEIGHT;
  const legendHeight = includeLegend ? LEGEND_HEIGHT : 0;
  const contentBottom = bodyY + rowAreaHeight;
  const height = contentBottom + legendHeight + FOOTER_HEIGHT + MARGIN;
  const width = MARGIN * 2 + LEFT_WIDTH + layout.width;
  const timelineX = MARGIN + LEFT_WIDTH;
  const phaseColorById = new Map<string, string>();
  for (const row of rows) {
    if (row.kind === 'activity') phaseColorById.set(row.activity.id, row.phaseColor);
  }
  const rowByActivity = visibleActivityMap(rows);
  const marker = todayMarker(project);

  const svg: string[] = [];
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<marker id="export-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 z" fill="#94A3B8"/></marker>',
    '<clipPath id="left-clip"><rect x="0" y="0" width="' + LEFT_WIDTH + '" height="' + (height - bodyY) + '"/></clipPath>',
    '</defs>',
    rect(0, 0, width, height, '#FFFFFF'),
  );

  if (includeTitle) {
    const titleY = MARGIN + 16;
    svg.push(
      rect(MARGIN, titleY - 3, 4, 26, project.color, { rx: 2 }),
      svgText(MARGIN + 14, titleY + 18, truncate(project.name, width - MARGIN * 2 - 380, 22), {
        size: 22,
        weight: 750,
        fill: '#0F172A',
      }),
      svgText(
        MARGIN + 14,
        titleY + 38,
        [
          project.code ? `${project.code} · ` : '',
          formatDateRange(project.computedStart, project.computedEnd),
          ` · ${project.activityCount} actividades`,
          ` · ${project.progress}% de avance`,
        ].join(''),
        { size: 10.5, fill: '#64748B' },
      ),
      svgText(width - MARGIN, titleY + 8, 'Generado el ' + formatLongDate(todayISO()), {
        size: 9.5,
        fill: '#94A3B8',
        anchor: 'end',
      }),
      svgText(width - MARGIN, titleY + 24, 'Cronograma Studio', {
        size: 10,
        weight: 650,
        fill: '#4F46E5',
        anchor: 'end',
      }),
    );
    // Barra de avance general
    const barX = width - MARGIN - 150;
    const barY = titleY + 38;
    svg.push(
      rect(barX, barY, 150, 4, '#EEF2F7', { rx: 2 }),
      rect(barX, barY, (150 * project.progress) / 100, 4, project.color, { rx: 2 }),
    );
  }

  // Encabezado izquierdo
  svg.push(
    rect(MARGIN, headerY, LEFT_WIDTH, HEADER_HEIGHT, '#FBFCFE'),
    line(MARGIN, headerY, MARGIN + LEFT_WIDTH, headerY, '#E2E8F0'),
    line(MARGIN, headerY + HEADER_HEIGHT, MARGIN + LEFT_WIDTH, headerY + HEADER_HEIGHT, '#E2E8F0'),
    line(MARGIN + LEFT_WIDTH, headerY, MARGIN + LEFT_WIDTH, headerY + HEADER_HEIGHT, '#E2E8F0'),
  );
  const leftPadding = 14;
  const startCol = MARGIN + 280;
  const endCol = startCol + 76;
  const durationCol = endCol + 76;
  const progressCol = durationCol + 52;
  svg.push(
    svgText(MARGIN + leftPadding, headerY + HEADER_HEIGHT - 12, 'ACTIVIDAD', {
      size: 8.5,
      weight: 750,
      fill: '#94A3B8',
      letterSpacing: 0.6,
    }),
    svgText(startCol, headerY + HEADER_HEIGHT - 12, 'INICIO', {
      size: 8.5,
      weight: 750,
      fill: '#94A3B8',
      letterSpacing: 0.6,
    }),
    svgText(endCol, headerY + HEADER_HEIGHT - 12, 'FIN', {
      size: 8.5,
      weight: 750,
      fill: '#94A3B8',
      letterSpacing: 0.6,
    }),
    svgText(durationCol + 46, headerY + HEADER_HEIGHT - 12, 'DÍAS', {
      size: 8.5,
      weight: 750,
      fill: '#94A3B8',
      letterSpacing: 0.6,
      anchor: 'end',
    }),
    svgText(progressCol + 62, headerY + HEADER_HEIGHT - 12, 'AVANCE', {
      size: 8.5,
      weight: 750,
      fill: '#94A3B8',
      letterSpacing: 0.6,
      anchor: 'end',
    }),
  );

  // Encabezado del calendario
  svg.push(
    rect(timelineX, headerY, layout.width, HEADER_HEIGHT, '#FBFCFE'),
    line(timelineX, headerY, timelineX + layout.width, headerY, '#E2E8F0'),
    line(timelineX, headerY + HEADER_HEIGHT, timelineX + layout.width, headerY + HEADER_HEIGHT, '#E2E8F0'),
  );
  for (const group of layout.groups) {
    const groupX = timelineX + group.x;
    svg.push(
      line(groupX, headerY, groupX, headerY + HEADER_HEIGHT, '#E2E8F0'),
      svgText(groupX + 7, headerY + 14, truncate(group.label, group.width - 12, 9.5), {
        size: 9.5,
        weight: 700,
        fill: '#475569',
      }),
    );
  }
  for (const unit of layout.units) {
    const unitX = timelineX + unit.x;
    if (layout.scale === 'day' && unit.isWeekend) {
      svg.push(
        rect(unitX, headerY + 22, unit.width, HEADER_HEIGHT - 22, unit.isHoliday ? '#FEF3C7' : '#F1F5F9', {
          opacity: unit.isHoliday ? 0.55 : 0.7,
        }),
      );
    }
    svg.push(
      line(unitX, headerY + 22, unitX, headerY + HEADER_HEIGHT, '#EDF1F6'),
      svgText(unitX + unit.width / 2, headerY + 34, truncate(unit.sublabel, unit.width, 8), {
        size: layout.scale === 'day' ? 7.3 : 8,
        fill: '#A3B0C2',
        anchor: 'middle',
      }),
      svgText(unitX + unit.width / 2, headerY + 48, truncate(unit.label, unit.width, 9.5), {
        size: layout.scale === 'day' ? 8.8 : 9.5,
        weight: 700,
        fill: unit.isWeekend ? '#94A3B8' : '#475569',
        anchor: 'middle',
      }),
    );
  }

  // Filas izquierdas
  for (const row of rows) {
    const y = bodyY + row.y;
    const isPhase = row.kind === 'phase';
    svg.push(rect(MARGIN, y, LEFT_WIDTH, row.height, isPhase ? '#F8FAFC' : '#FFFFFF'));
    svg.push(line(MARGIN, y + row.height, MARGIN + LEFT_WIDTH, y + row.height, isPhase ? '#E8EDF4' : '#F1F5F9'));
    if (isPhase) {
      const centerY = y + row.height / 2 + 3.3;
      svg.push(
        rect(MARGIN + 12, y + row.height / 2 - 8, 3, 16, row.color, { rx: 1.5 }),
        svgText(MARGIN + 22, centerY, truncate(row.name, 220, 9.5), {
          size: 9.7,
          weight: 700,
          fill: '#1E293B',
        }),
        svgText(MARGIN + 22 + Math.min(220, row.name.length * 5.7) + 6, centerY, String(row.activityCount), {
          size: 8.5,
          fill: '#A3B0C2',
        }),
      );
      if (row.activityCount > 0) {
        const barX = MARGIN + 360;
        svg.push(
          rect(barX, y + row.height / 2 - 2, 42, 4, '#E9EEF5', { rx: 2 }),
          rect(barX, y + row.height / 2 - 2, (42 * row.progress) / 100, 4, row.color, { rx: 2 }),
          svgText(barX + 46, centerY, `${row.progress}%`, { size: 8, weight: 700, fill: '#94A3B8' }),
        );
        if (row.start && row.end) {
          svg.push(
            svgText(MARGIN + LEFT_WIDTH - 12, centerY, `${formatShortDate(row.start)} – ${formatShortDate(row.end)}`, {
              size: 8.2,
              fill: '#B0BBC9',
              anchor: 'end',
            }),
          );
        }
      }
    } else {
      const activity = row.activity;
      const status = ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.pending;
      const centerY = y + row.height / 2 + 3.3;
      const indent = row.depth * 11;
      const dotX = MARGIN + 16 + indent;
      const nameX = dotX + 10;
      const nameMax = startCol - nameX - 12;
      if (activity.type === 'milestone') {
        svg.push(
          `<polygon points="${dotX - 1},${y + row.height / 2} ${dotX + 4},${y + row.height / 2 - 5} ${dotX + 9},${y + row.height / 2} ${dotX + 4},${y + row.height / 2 + 5}" fill="${activity.color || row.phaseColor}" stroke="#FFFFFF" stroke-width="1"/>`,
        );
      } else {
        svg.push(`<circle cx="${dotX + 3}" cy="${y + row.height / 2}" r="3.2" fill="${status.bar}"/>`);
      }
      svg.push(
        svgText(nameX, centerY, truncate(activity.name, nameMax, 9.5), {
          size: 9.6,
          weight: row.depth > 0 ? 500 : 550,
          fill: activity.status === 'completed' ? '#64748B' : '#1E293B',
        }),
        svgText(startCol, centerY, formatShortDate(activity.startDate), { size: 8.6, fill: '#64748B' }),
        svgText(endCol, centerY, formatShortDate(activity.endDate), { size: 8.6, fill: '#64748B' }),
        svgText(durationCol + 46, centerY, activity.type === 'milestone' ? '—' : `${activity.duration}d`, {
          size: 8.6,
          fill: '#64748B',
          anchor: 'end',
        }),
        rect(progressCol, y + row.height / 2 - 2, 32, 4, '#EEF2F7', { rx: 2 }),
        rect(progressCol, y + row.height / 2 - 2, (32 * activity.progress) / 100, 4, status.bar, { rx: 2 }),
        svgText(progressCol + 62, centerY, `${activity.progress}%`, {
          size: 8.2,
          weight: 700,
          fill: '#64748B',
          anchor: 'end',
        }),
      );
    }
  }
  svg.push(
    line(MARGIN, bodyY + rowAreaHeight, MARGIN + LEFT_WIDTH, bodyY + rowAreaHeight, '#E2E8F0'),
    line(MARGIN + LEFT_WIDTH, bodyY, MARGIN + LEFT_WIDTH, bodyY + rowAreaHeight, '#E2E8F0'),
  );

  // Cuerpo del calendario
  svg.push(`<g transform="translate(${timelineX}, ${bodyY})">`);
  for (const row of rows) {
    const isPhase = row.kind === 'phase';
    svg.push(
      rect(0, row.y, layout.width, row.height, isPhase ? '#F8FAFC' : '#FFFFFF'),
      line(0, row.y + row.height, layout.width, row.y + row.height, isPhase ? '#E8EDF4' : '#F1F5F9'),
    );
  }
  for (const band of layout.bands) {
    svg.push(
      rect(band.x, 0, band.width, rowAreaHeight, band.kind === 'holiday' ? '#FEF3C7' : '#F1F5F9', {
        opacity: band.kind === 'holiday' ? 0.45 : 0.62,
      }),
    );
  }
  for (const x of layout.unitBoundaries) svg.push(line(x, 0, x, rowAreaHeight, '#EDF1F6'));
  for (const x of layout.groupBoundaries) svg.push(line(x, 0, x, rowAreaHeight, '#DCE4EE'));

  // Barras de resumen de fase
  for (const row of rows) {
    if (row.kind !== 'phase' || !row.start || !row.end) continue;
    const x = (layout.rangeStart <= row.start ? 0 : 0) + dateXInLayout(row.start, layout.rangeStart, layout.pxPerDay);
    const endX = dateXInLayout(row.end, layout.rangeStart, layout.pxPerDay) + layout.pxPerDay;
    const w = Math.max(3, endX - x);
    const by = row.y + row.height / 2 - 2.5;
    svg.push(
      rect(x, by, w, 5, row.color, { rx: 2.5, opacity: 0.16 }),
      rect(x, by, (w * row.progress) / 100, 5, row.color, { rx: 2.5, opacity: 0.85 }),
      `<path d="M ${x + 0.75} ${by - 3} V ${by + 8} M ${endX - 0.75} ${by - 3} V ${by + 8}" stroke="${row.color}" stroke-width="1.2" opacity="0.7" fill="none"/>`,
    );
  }

  // Dependencias
  for (const dependency of dependencies) {
    if (dependency.type !== 'FS') continue;
    const predecessorRow = rowByActivity.get(dependency.predecessorId);
    const successorRow = rowByActivity.get(dependency.successorId);
    if (!predecessorRow || !successorRow) continue;
    const { path } = dependencyPath(
      predecessorRow.activity,
      successorRow.activity,
      predecessorRow,
      successorRow,
      layout,
    );
    svg.push(
      `<path d="${path}" fill="none" stroke="#94A3B8" stroke-width="1.25" opacity="0.9" marker-end="url(#export-arrow)"/>`,
    );
  }

  // Barras de actividad
  for (const row of rows) {
    if (row.kind !== 'activity') continue;
    const activity = row.activity;
    const color = activity.color || row.phaseColor;
    const status = ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.pending;
    const bar = activityBar(activity, layout);
    const barHeight = 20;
    const barY = row.y + row.height / 2 - barHeight / 2;
    const progressWidth = (bar.width * activity.progress) / 100;
    const centerY = row.y + row.height / 2 + 3.4;
    if (activity.type === 'milestone') {
      svg.push(
        `<polygon points="${bar.x + 6},${barY + barHeight / 2} ${bar.x + 13},${barY + 3} ${bar.x + 20},${barY + barHeight / 2} ${bar.x + 13},${barY + barHeight - 3}" fill="${color}" stroke="#FFFFFF" stroke-width="1.4"/>`,
        svgText(bar.x + 25, centerY, truncate(activity.name, Math.max(40, layout.width - bar.x - 30), 9.5), {
          size: 9.3,
          fill: '#334155',
        }),
      );
      continue;
    }
    if (activity.type === 'summary') {
      svg.push(
        `<path d="M ${bar.x} ${barY + barHeight - 5} H ${bar.x} V ${barY + 4} H ${bar.x + bar.width} V ${barY + barHeight - 5} H ${bar.x + bar.width} V ${barY + barHeight} H ${bar.x} z" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.2"/>`,
        rect(bar.x, barY + 4, bar.width, 4, color, { opacity: 0.75 }),
        svgText(bar.x + bar.width + 6, centerY, truncate(activity.name, Math.max(40, layout.width - bar.x - bar.width - 12), 9.5), {
          size: 9.3,
          fill: '#334155',
        }),
      );
      continue;
    }
    const rightSpace = layout.width - (bar.x + bar.width) - 8;
    const labelInside = rightSpace < 120 && bar.width > 90;
    const label = truncate(
      activity.name,
      labelInside ? Math.max(30, bar.width - 18) : Math.max(50, rightSpace - 4),
      9.5,
    );
    const labelColor = labelInside && activity.progress > 55 ? '#FFFFFF' : '#334155';
    svg.push(
      rect(bar.x, barY, bar.width, barHeight, color, { rx: 3.5, opacity: 0.16 }),
      rect(bar.x, barY, bar.width, barHeight, 'transparent', { rx: 3.5, stroke: `${color}B8`, strokeWidth: 1 }),
      rect(bar.x + 0.7, barY + 0.7, Math.max(0, Math.min(bar.width - 1.4, progressWidth)), barHeight - 1.4, color, { rx: 3, opacity: 0.92 }),
      rect(bar.x, barY, Math.min(3, bar.width), barHeight, status.bar, { rx: 1.5, opacity: 0.9 }),
      svgText(labelInside ? bar.x + 7 : bar.x + bar.width + 6, centerY, label, {
        size: 9.3,
        weight: 500,
        fill: labelColor,
      }),
    );
  }

  // Línea de hoy
  if (marker) {
    const markerX = dateCenterX(marker.date, layout);
    if (markerX >= 0 && markerX <= layout.width) {
      svg.push(
        line(markerX, 0, markerX, rowAreaHeight, '#F59E0B', 1.6),
        `<polygon points="${markerX - 4},0 ${markerX + 4},0 ${markerX},6" fill="#F59E0B"/>`,
      );
    }
  }
  svg.push('</g>');

  // Leyenda
  if (includeLegend) {
    const legendY = contentBottom + 18;
    let legendX = MARGIN;
    const items: { color: string; label: string }[] = [
      { color: '#10B981', label: 'Completada' },
      { color: '#F59E0B', label: 'En progreso' },
      { color: '#94A3B8', label: 'Pendiente' },
      { color: '#DC2626', label: 'Bloqueada' },
    ];
    for (const item of items) {
      svg.push(
        rect(legendX, legendY - 3, 16, 4, item.color, { rx: 2 }),
        svgText(legendX + 21, legendY, item.label, { size: 8.8, fill: '#94A3B8' }),
      );
      legendX += 21 + item.label.length * 5.2 + 18;
    }
    svg.push(
      line(legendX + 2, legendY - 6, legendX + 2, legendY + 2, '#F59E0B', 1.5),
      svgText(legendX + 8, legendY, project.referenceDate ? 'Referencia' : 'Hoy', { size: 8.8, fill: '#94A3B8' }),
    );
    legendX += 70;
    svg.push(
      line(legendX, legendY, legendX + 16, legendY, '#94A3B8', 1, '2 2'),
      svgText(legendX + 21, legendY, 'Dependencia FS', { size: 8.8, fill: '#94A3B8' }),
    );
    legendX += 100;
    svg.push(
      rect(legendX, legendY - 5, 10, 10, '#F1F5F9'),
      svgText(legendX + 15, legendY, 'Día no laborable', { size: 8.8, fill: '#94A3B8' }),
    );
    const workingNames = project.workingDays
      .slice()
      .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
      .map((day) => WEEKDAYS_ES_SHORT[day])
      .join(' · ');
    svg.push(
      svgText(width - MARGIN, legendY, `Días laborables: ${workingNames}`, {
        size: 8.8,
        fill: '#B0BBC9',
        anchor: 'end',
      }),
    );
  }

  // Pie
  const footerY = height - 12;
  svg.push(
    line(MARGIN, footerY - 16, width - MARGIN, footerY - 16, '#EEF2F7'),
    svgText(MARGIN, footerY, `Generado el ${formatLongDate(todayISO())} · Vista ${{ day: 'diaria', week: 'semanal', month: 'mensual' }[options.scale]}`, {
      size: 8.5,
      fill: '#B0BBC9',
    }),
    svgText(width - MARGIN, footerY, 'Cronograma Studio', {
      size: 8.5,
      fill: '#B0BBC9',
      anchor: 'end',
    }),
  );

  svg.push('</svg>');
  return { svg: svg.join(''), width, height };
}

function dateXInLayout(date: string, rangeStart: string, pxPerDay: number): number {
  const start = new Date(`${rangeStart}T00:00:00Z`).getTime();
  const current = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((current - start) / 86_400_000) * pxPerDay;
}
