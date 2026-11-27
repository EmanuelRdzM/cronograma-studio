import { useEffect, useId, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import type { Activity, Dependency } from '@/api/types';
import {
  HEADER_HEIGHT,
  activityBar,
  dateCenterX,
  dateToX,
  dependencyPath,
  todayMarker,
  type GanttLayout,
  type GanttRow,
  type ActivityRow,
  type PhaseRow,
} from './layout';
import { ACTIVITY_STATUS } from '@/lib/labels';
import { addDays, formatShortDate, todayISO } from '@/lib/dates';
import {
  endDateFromDuration,
  snapToWorkingDay,
  type CalendarConfig,
} from '@/lib/calendar';

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

export function TimelineHeader({
  layout,
  marker,
}: {
  layout: GanttLayout;
  marker: { date: string; isReference: boolean } | null;
}) {
  const markerX = marker ? dateCenterX(marker.date, layout) : null;
  const markerVisible = markerX !== null && markerX >= 0 && markerX <= layout.width;
  return (
    <Box sx={{ position: 'relative', width: layout.width, height: HEADER_HEIGHT, backgroundColor: '#FBFCFE', borderBottom: '1px solid #E2E8F0' }}>
      <Box sx={{ position: 'absolute', inset: 0, height: 22, display: 'flex', borderBottom: '1px solid #EDF1F6' }}>
        {layout.groups.map((group) => (
          <Box
            key={group.key}
            sx={{
              position: 'absolute',
              left: group.x,
              width: group.width,
              height: 22,
              px: 0.9,
              display: 'flex',
              alignItems: 'center',
              borderLeft: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <Box component="span" sx={{ fontSize: 10, fontWeight: 750, letterSpacing: '.04em', color: '#475569', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
              {group.label}
            </Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ position: 'absolute', top: 22, left: 0, right: 0, bottom: 0 }}>
        {layout.units.map((unit) => (
          <Box
            key={unit.key}
            sx={{
              position: 'absolute',
              left: unit.x,
              width: unit.width,
              top: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '1px solid #EDF1F6',
              backgroundColor:
                layout.scale === 'day'
                  ? unit.isHoliday
                    ? 'rgba(254,243,199,.5)'
                    : unit.isWeekend
                      ? 'rgba(241,245,249,.65)'
                      : 'transparent'
                  : 'transparent',
              overflow: 'hidden',
            }}
          >
            <Box component="span" sx={{ fontSize: layout.scale === 'day' ? 8.5 : 9, color: '#A3B0C2', lineHeight: 1.1, fontWeight: 500 }}>
              {unit.sublabel}
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: layout.scale === 'day' ? 10.5 : 11,
                color: unit.isWeekend ? '#94A3B8' : '#475569',
                lineHeight: 1.2,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {unit.label}
            </Box>
          </Box>
        ))}
      </Box>
      {markerVisible && markerX !== null && (
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: markerX - 1, width: 2, backgroundColor: '#F59E0B', zIndex: 3, pointerEvents: 'none' }}>
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#F59E0B',
              color: '#fff',
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '.04em',
              px: 0.55,
              py: 0.2,
              borderRadius: 0.7,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(180,83,9,.35)',
            }}
          >
            {marker?.isReference ? 'REF' : 'HOY'}
          </Box>
        </Box>
      )}
    </Box>
  );
}

type DragMode = 'move' | 'start' | 'end';

interface DragState {
  activity: Activity;
  mode: DragMode;
  startClientX: number;
  originalStart: string;
  originalEnd: string;
  previewStart: string;
  previewEnd: string;
  moved: boolean;
}

function computePreview(
  activity: Activity,
  mode: DragMode,
  deltaDays: number,
  calendar: CalendarConfig,
): { start: string; end: string } {
  const unit = activity.durationUnit;
  const isMilestone = activity.type === 'milestone';
  if (mode === 'move') {
    let start = addDays(activity.startDate, deltaDays);
    if (unit === 'working_day') start = snapToWorkingDay(start, calendar);
    const end = isMilestone
      ? start
      : endDateFromDuration(start, Math.max(1, activity.duration), calendar, unit);
    return { start, end };
  }
  if (mode === 'start') {
    let start = addDays(activity.startDate, deltaDays);
    if (unit === 'working_day') start = snapToWorkingDay(start, calendar);
    if (start > activity.endDate) start = activity.endDate;
    return { start, end: activity.endDate };
  }
  let end = addDays(activity.endDate, deltaDays);
  if (unit === 'working_day') end = snapToWorkingDay(end, calendar);
  if (end < activity.startDate) end = activity.startDate;
  return { start: activity.startDate, end };
}

export function TimelineBody({
  layout,
  rows,
  dependencies,
  calendar,
  marker,
  selectedId,
  hoveredId,
  readOnly = false,
  onHover,
  onOpenActivity,
  onDatesChange,
  onDependencyClick,
}: {
  layout: GanttLayout;
  rows: GanttRow[];
  dependencies: Dependency[];
  calendar: CalendarConfig;
  marker: { date: string; isReference: boolean } | null;
  selectedId: string | null;
  hoveredId: string | null;
  readOnly?: boolean;
  onHover: (id: string | null) => void;
  onOpenActivity: (activity: Activity) => void;
  onDatesChange: (activity: Activity, startDate: string, endDate: string) => void;
  onDependencyClick?: (dependency: Dependency) => void;
}) {
  const markerId = useId().replace(/:/g, '');
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragging = drag !== null;

  const activityRows = new Map<string, ActivityRow>();
  const phaseRows: PhaseRow[] = [];
  for (const row of rows) {
    if (row.kind === 'activity') activityRows.set(row.activity.id, row);
    else phaseRows.push(row);
  }

  const height = rows.length
    ? rows[rows.length - 1].y + rows[rows.length - 1].height
    : 220;

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const rawDelta = (event.clientX - current.startClientX) / layout.pxPerDay;
      const delta = Math.round(rawDelta);
      const next = computePreview(current.activity, current.mode, delta, calendar);
      const moved = current.moved || Math.abs(event.clientX - current.startClientX) > 3;
      const state: DragState = {
        ...current,
        moved,
        previewStart: next.start,
        previewEnd: next.end,
      };
      dragRef.current = state;
      setDrag(state);
    };
    const handleUp = () => {
      const current = dragRef.current;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      if (!current) return;
      dragRef.current = null;
      setDrag(null);
      if (!current.moved) {
        onOpenActivity(current.activity);
        return;
      }
      if (current.previewStart !== current.activity.startDate || current.previewEnd !== current.activity.endDate) {
        onDatesChange(current.activity, current.previewStart, current.previewEnd);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, layout.pxPerDay, calendar, onDatesChange, onOpenActivity]);

  const startDrag = (activity: Activity, mode: DragMode, event: React.PointerEvent) => {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    const state: DragState = {
      activity,
      mode,
      startClientX: event.clientX,
      originalStart: activity.startDate,
      originalEnd: activity.endDate,
      previewStart: activity.startDate,
      previewEnd: activity.endDate,
      moved: false,
    };
    dragRef.current = state;
    setDrag(state);
  };

  const today = todayISO();
  const markerX = marker ? dateCenterX(marker.date, layout) : null;
  const markerVisible = markerX !== null && markerX >= 0 && markerX <= layout.width;

  return (
    <Box sx={{ position: 'relative', width: layout.width, height }}>
      <svg width={layout.width} height={height} style={{ display: 'block', overflow: 'visible' }}>
        {/* Fondos de fila y líneas horizontales */}
        {rows.map((row) => {
          const isPhase = row.kind === 'phase';
          const isSelected = !isPhase && selectedId === row.id;
          const isHovered = hoveredId === row.id;
          const fill = isPhase
            ? isHovered ? '#F4F7FC' : '#F8FAFC'
            : isSelected ? '#EEF2FF' : isHovered ? '#F8FAFF' : '#FFFFFF';
          return (
            <g key={row.id}>
              <rect
                x={0}
                y={row.y}
                width={layout.width}
                height={row.height}
                fill={fill}
                onMouseEnter={() => onHover(row.id)}
                onMouseLeave={() => onHover(null)}
              />
              <line
                x1={0}
                x2={layout.width}
                y1={row.y + row.height - 0.5}
                y2={row.y + row.height - 0.5}
                stroke={isPhase ? '#E8EDF4' : '#F1F5F9'}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* Bandas de días no laborables */}
        {layout.bands.map((band, index) => (
          <rect
            key={`${band.x}-${index}`}
            x={band.x}
            y={0}
            width={band.width}
            height={height}
            fill={band.kind === 'holiday' ? '#FEF3C7' : '#F1F5F9'}
            opacity={band.kind === 'holiday' ? 0.42 : 0.62}
            pointerEvents="none"
          />
        ))}

        {/* Rejilla vertical */}
        {layout.unitBoundaries.map((x, index) => (
          <line
            key={`u-${x}-${index}`}
            x1={x}
            x2={x}
            y1={0}
            y2={height}
            stroke="#EDF1F6"
            strokeWidth={1}
            pointerEvents="none"
          />
        ))}
        {layout.groupBoundaries.map((x, index) => (
          <line
            key={`g-${x}-${index}`}
            x1={x}
            x2={x}
            y1={0}
            y2={height}
            stroke="#DCE4EE"
            strokeWidth={1}
            pointerEvents="none"
          />
        ))}

        {/* Resumen de fase */}
        {phaseRows.map((row) => {
          if (!row.start || !row.end) return null;
          const x = dateToX(row.start, layout);
          const endX = dateToX(row.end, layout) + layout.pxPerDay;
          const width = Math.max(3, endX - x);
          const y = row.y + row.height / 2 - 2.5;
          const progressWidth = Math.max(0, (width * row.progress) / 100);
          return (
            <g key={`summary-${row.id}`} pointerEvents="none">
              <rect x={x} y={y} width={width} height={5} rx={2.5} fill={`${row.color}26`} />
              <rect x={x} y={y} width={progressWidth} height={5} rx={2.5} fill={row.color} opacity={0.85} />
              <path d={`M ${x + 0.75} ${y - 3} V ${y + 8} M ${endX - 0.75} ${y - 3} V ${y + 8}`} stroke={row.color} strokeWidth={1.3} opacity={0.75} />
            </g>
          );
        })}

        {/* Dependencias */}
        <defs>
          <marker
            id={`arrow-${markerId}`}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#94A3B8" />
          </marker>
        </defs>
        {dependencies.map((dependency) => {
            if (dependency.type !== 'FS') return null;
            const predecessor = rows.find(
              (row) => row.kind === 'activity' && row.activity.id === dependency.predecessorId,
            ) as ActivityRow | undefined;
            const successor = rows.find(
              (row) => row.kind === 'activity' && row.activity.id === dependency.successorId,
            ) as ActivityRow | undefined;
            if (!predecessor || !successor) return null;
            const { path } = dependencyPath(
              predecessor.activity,
              successor.activity,
              predecessor,
              successor,
              layout,
            );
            return (
              <g key={dependency.id}>
                <path
                  d={path}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth={1.35}
                  markerEnd={`url(#arrow-${markerId})`}
                  opacity={0.9}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={11}
                  style={{ cursor: onDependencyClick && !readOnly ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (!readOnly) onDependencyClick?.(dependency);
                  }}
                >
                  <title>{`Dependencia Fin → Inicio${dependency.lag ? `, +${dependency.lag} días` : ''}.${!readOnly ? ' Clic para editar.' : ''}`}</title>
                </path>
              </g>
            );
          })}

        {/* Barras */}
        {rows.map((row) => {
          if (row.kind !== 'activity') return null;
          const activity = row.activity;
          const isDragging = drag?.activity.id === activity.id;
          const startDate = isDragging ? drag.previewStart : activity.startDate;
          const endDate = isDragging ? drag.previewEnd : activity.endDate;
          const previewActivity = isDragging ? { ...activity, startDate, endDate } : activity;
          const bar = activityBar(previewActivity, layout);
          const barHeight = 21;
          const barY = row.y + row.height / 2 - barHeight / 2;
          const color = activity.color || row.phaseColor;
          const status = ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.pending;
          const isSelected = selectedId === activity.id;
          const isHovered = hoveredId === row.id || isDragging;
          const isMilestone = activity.type === 'milestone';
          const isSummary = activity.type === 'summary';
          const overdue = !isMilestone && activity.progress < 100 && activity.endDate < today && activity.status !== 'completed';
          const progressWidth = Math.max(0, (bar.width * activity.progress) / 100);
          const label = activity.name;
          const rightSpace = layout.width - (bar.x + bar.width) - 8;
          const labelInside = rightSpace < 120 && bar.width > 90;
          const labelChars = Math.max(
            4,
            Math.floor((labelInside ? bar.width - 14 : Math.max(70, rightSpace)) / 6.2),
          );
          const displayLabel = truncate(label, labelChars);
          const labelX = labelInside ? bar.x + 7 : bar.x + bar.width + 7;
          const labelFill = labelInside && activity.progress > 55 ? '#FFFFFF' : activity.status === 'completed' ? '#64748B' : '#334155';

          return (
            <g
              key={activity.id}
              className={readOnly ? undefined : 'gantt-bar'}
              onMouseEnter={() => onHover(row.id)}
              onMouseLeave={() => onHover(null)}
            >
              <title>
                {`${activity.name}\n${formatShortDate(startDate)} → ${formatShortDate(endDate)}\nDuración: ${activity.duration} días\nAvance: ${activity.progress}%${activity.assignee ? `\nResponsable: ${activity.assignee}` : ''}`}
              </title>
              {selectedId === activity.id && (
                <rect
                  x={bar.x - 3}
                  y={barY - 3}
                  width={bar.width + 6}
                  height={barHeight + 6}
                  rx={6}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth={1.6}
                  opacity={0.8}
                />
              )}
              {isMilestone ? (
                <g
                  onPointerDown={(event) => startDrag(activity, 'move', event)}
                  style={{ cursor: readOnly ? 'default' : 'grab' }}
                >
                  <polygon
                    points={`${bar.x + 7},${barY + barHeight / 2} ${bar.x + 14},${barY + 3} ${bar.x + 21},${barY + barHeight / 2} ${bar.x + 14},${barY + barHeight - 3}`}
                    fill={color}
                    stroke={isHovered ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={1.6}
                  />
                </g>
              ) : isSummary ? (
                <g
                  onPointerDown={(event) => startDrag(activity, 'move', event)}
                  style={{ cursor: readOnly ? 'default' : 'grab' }}
                >
                  <path
                    d={`M ${bar.x} ${barY + barHeight - 5} H ${bar.x} V ${barY + 4} H ${bar.x + bar.width} V ${barY + barHeight - 5} H ${bar.x + bar.width} V ${barY + barHeight} H ${bar.x} z`}
                    fill={`${color}2E`}
                    stroke={color}
                    strokeWidth={1.2}
                  />
                  <rect x={bar.x} y={barY + 4} width={bar.width} height={4} fill={color} opacity={0.75} />
                </g>
              ) : (
                <g
                  onPointerDown={(event) => startDrag(activity, 'move', event)}
                  style={{ cursor: readOnly ? 'default' : 'grab' }}
                >
                  <rect
                    x={bar.x}
                    y={barY}
                    width={bar.width}
                    height={barHeight}
                    rx={4}
                    fill={`${color}24`}
                    stroke={overdue ? '#EF4444' : isHovered || isSelected ? color : `${color}B8`}
                    strokeWidth={overdue ? 1.4 : 1}
                    strokeDasharray={overdue ? '4 2.5' : undefined}
                  />
                  <rect
                    x={bar.x + 0.8}
                    y={barY + 0.8}
                    width={Math.max(0, Math.min(bar.width - 1.6, progressWidth))}
                    height={barHeight - 1.6}
                    rx={3.4}
                    fill={color}
                    opacity={0.92}
                  />
                  <rect x={bar.x} y={barY} width={Math.min(3, bar.width)} height={barHeight} rx={2} fill={status.bar} opacity={0.85} />
                  {!readOnly && bar.width > 18 && (
                    <>
                      <rect
                        x={bar.x - 3}
                        y={barY}
                        width={8}
                        height={barHeight}
                        fill="transparent"
                        style={{ cursor: 'ew-resize' }}
                        onPointerDown={(event) => startDrag(activity, 'start', event)}
                      >
                        <title>Ajustar fecha de inicio</title>
                      </rect>
                      <rect
                        x={bar.x + bar.width - 5}
                        y={barY}
                        width={8}
                        height={barHeight}
                        fill="transparent"
                        style={{ cursor: 'ew-resize' }}
                        onPointerDown={(event) => startDrag(activity, 'end', event)}
                      >
                        <title>Ajustar fecha de fin</title>
                      </rect>
                    </>
                  )}
                </g>
              )}
              <text
                x={labelX}
                y={row.y + row.height / 2 + 3.6}
                fontSize={10.5}
                fontWeight={520}
                fill={labelFill}
                pointerEvents="auto"
                onClick={() => {
                  if (!readOnly) onOpenActivity(activity);
                }}
                style={{ userSelect: 'none', cursor: readOnly ? 'default' : 'pointer' }}
              >
                {displayLabel}
              </text>
              {overdue && (
                <circle cx={bar.x + bar.width + 3} cy={barY - 2} r={2.6} fill="#EF4444" pointerEvents="none">
                  <title>Actividad atrasada</title>
                </circle>
              )}
            </g>
          );
        })}

        {/* Línea de hoy / referencia */}
        {markerVisible && markerX !== null && (
          <g pointerEvents="none">
            <line x1={markerX} x2={markerX} y1={0} y2={height} stroke="#F59E0B" strokeWidth={1.6} opacity={0.9} />
            <polygon points={`${markerX - 4},0 ${markerX + 4},0 ${markerX},6`} fill="#F59E0B" />
          </g>
        )}

        {/* Indicador de arrastre con fechas */}
        {drag && (
          <g pointerEvents="none">
            {(() => {
              const row = activityRows.get(drag.activity.id);
              if (!row) return null;
              const temp = { ...drag.activity, startDate: drag.previewStart, endDate: drag.previewEnd };
              const bar = activityBar(temp, layout);
              const width = Math.max(120, (formatShortDate(drag.previewStart).length + formatShortDate(drag.previewEnd).length) * 5.8 + 30);
              const x = Math.max(2, Math.min(layout.width - width - 2, bar.x + bar.width / 2 - width / 2));
              const y = Math.max(2, row.y - 17);
              return (
                <g>
                  <rect x={x} y={y} width={width} height={18} rx={4} fill="#0F172A" opacity={0.94} />
                  <text x={x + width / 2} y={y + 12.5} textAnchor="middle" fontSize={9.5} fontWeight={650} fill="#FFFFFF">
                    {formatShortDate(drag.previewStart)} → {formatShortDate(drag.previewEnd)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </Box>
  );
}
