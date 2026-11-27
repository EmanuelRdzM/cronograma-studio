import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SubdirectoryArrowRightRoundedIcon from '@mui/icons-material/SubdirectoryArrowRightRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import FunctionsRoundedIcon from '@mui/icons-material/FunctionsRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import type { Activity, Phase } from '@/api/types';
import { HEADER_HEIGHT, type GanttRow, type PhaseRow, type ActivityRow } from './layout';
import { ACTIVITY_STATUS } from '@/lib/labels';
import { formatShortDateNoYear } from '@/lib/dates';

const FULL_COLUMNS = 'minmax(0, 1fr) 70px 70px 46px 62px';
const COMPACT_COLUMNS = 'minmax(0, 1fr) 60px';

export interface LeftTableCallbacks {
  onHover: (id: string | null) => void;
  onOpenActivity: (activity: Activity) => void;
  onDuplicateActivity: (activity: Activity) => void;
  onDeleteActivity: (activity: Activity) => void;
  onAddSubactivity: (activity: Activity) => void;
  onMoveActivity: (activity: Activity, direction: 'up' | 'down') => void;
  onTogglePhase: (phaseId: string | null) => void;
  onAddActivity: (phaseId: string | null) => void;
  onEditPhase: (phase: Phase) => void;
  onDeletePhase: (phase: Phase) => void;
}function HeaderLabel({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <Typography
      component="div"
      sx={{
        fontSize: 9.5,
        fontWeight: 750,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: '#94A3B8',
        textAlign: align,
        px: align === 'right' ? 0.4 : 0,
      }}
    >
      {children}
    </Typography>
  );
}

export function LeftHeader({
  compact,
  panMode = false,
  narrow = false,
}: {
  compact: boolean;
  panMode?: boolean;
  narrow?: boolean;
}) {
  return (
    <Box
      sx={{
        height: HEADER_HEIGHT,
        flexShrink: 0,
        px: compact ? 1.4 : 1.6,
        display: 'grid',
        gridTemplateColumns: compact ? COMPACT_COLUMNS : FULL_COLUMNS,
        alignItems: 'end',
        gap: compact ? 1 : 0.8,
        pb: 1.15,
        backgroundColor: '#FBFCFE',
        borderBottom: '1px solid #E2E8F0',
        borderRight: '1px solid #E2E8F0',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'end' }}>
        <HeaderLabel>Actividad</HeaderLabel>
        {!compact && !narrow && (
          <Typography sx={{ fontSize: 9, color: '#C0CAD7', letterSpacing: '.02em' }}>
            {panMode ? 'Arrastra para desplazarte' : 'Arrastra las barras para mover'}
          </Typography>
        )}
      </Box>
      {compact ? (
        <HeaderLabel align="right">Avance</HeaderLabel>
      ) : (
        <>
          <HeaderLabel>Inicio</HeaderLabel>
          <HeaderLabel>Fin</HeaderLabel>
          <HeaderLabel align="right">Días</HeaderLabel>
          <HeaderLabel align="right">Avance</HeaderLabel>
        </>
      )}
    </Box>
  );
}

function RowMenu({
  kind,
  activity,
  phase,
  onOpenActivity,
  onDuplicateActivity,
  onDeleteActivity,
  onAddSubactivity,
  onMoveActivity,
  onAddActivity,
  onEditPhase,
  onDeletePhase,
}: {
  kind: 'activity' | 'phase';
  activity?: Activity;
  phase?: Phase | null;
  onOpenActivity: (activity: Activity) => void;
  onDuplicateActivity: (activity: Activity) => void;
  onDeleteActivity: (activity: Activity) => void;
  onAddSubactivity: (activity: Activity) => void;
  onMoveActivity: (activity: Activity, direction: 'up' | 'down') => void;
  onAddActivity: (phaseId: string | null) => void;
  onEditPhase: (phase: Phase) => void;
  onDeletePhase: (phase: Phase) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const close = () => setAnchorEl(null);
  return (
    <>
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          setAnchorEl(event.currentTarget);
        }}
        sx={{ width: 24, height: 24, color: '#94A3B8', '&:hover': { color: '#475569' } }}
        aria-label="Acciones"
      >
        <MoreHorizRoundedIcon sx={{ fontSize: 17 }} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        onClick={(event) => event.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {kind === 'phase' ? (
          <>
            <MenuItem
              onClick={() => {
                close();
                onAddActivity(phase?.id ?? null);
              }}
            >
              <ListItemIcon>
                <AddRoundedIcon fontSize="small" />
              </ListItemIcon>
              Nueva actividad
            </MenuItem>
            {phase && (
              <MenuItem
                onClick={() => {
                  close();
                  onEditPhase(phase);
                }}
              >
                <ListItemIcon>
                  <EditRoundedIcon fontSize="small" />
                </ListItemIcon>
                Editar fase
              </MenuItem>
            )}
            {phase && (
              <MenuItem
                onClick={() => {
                  close();
                  onDeletePhase(phase);
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <DeleteOutlineRoundedIcon fontSize="small" color="error" />
                </ListItemIcon>
                Eliminar fase
              </MenuItem>
            )}
          </>
        ) : activity ? (
          <>
            <MenuItem
              onClick={() => {
                close();
                onOpenActivity(activity);
              }}
            >
              <ListItemIcon>
                <EditRoundedIcon fontSize="small" />
              </ListItemIcon>
              Editar actividad
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onAddSubactivity(activity);
              }}
            >
              <ListItemIcon>
                <SubdirectoryArrowRightRoundedIcon fontSize="small" />
              </ListItemIcon>
              Nueva subactividad
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onMoveActivity(activity, 'up');
              }}
            >
              <ListItemIcon>
                <ArrowUpwardRoundedIcon fontSize="small" />
              </ListItemIcon>
              Mover arriba
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onMoveActivity(activity, 'down');
              }}
            >
              <ListItemIcon>
                <ArrowDownwardRoundedIcon fontSize="small" />
              </ListItemIcon>
              Mover abajo
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onDuplicateActivity(activity);
              }}
            >
              <ListItemIcon>
                <ContentCopyRoundedIcon fontSize="small" />
              </ListItemIcon>
              Duplicar
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                onDeleteActivity(activity);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteOutlineRoundedIcon fontSize="small" color="error" />
              </ListItemIcon>
              Eliminar
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  );
}

function PhaseRowView({
  row,
  hovered,
  compact,
  narrow,
  callbacks,
  onOpenPhase,
  readOnly,
}: {
  row: PhaseRow;
  hovered: boolean;
  compact: boolean;
  narrow: boolean;
  callbacks: LeftTableCallbacks;
  onOpenPhase: (phase: Phase) => void;
  readOnly: boolean;
}) {
  return (
    <Box
      onMouseEnter={() => callbacks.onHover(row.id)}
      onMouseLeave={() => callbacks.onHover(null)}
      onClick={() => {
        if (readOnly) callbacks.onTogglePhase(row.phase?.id ?? null);
        else if (row.phase) onOpenPhase(row.phase);
        else callbacks.onTogglePhase(null);
      }}
      sx={{
        height: row.height,
        display: 'flex',
        alignItems: 'center',
        gap: 0.8,
        px: 1,
        backgroundColor: hovered ? '#F4F7FC' : '#F8FAFC',
        borderBottom: '1px solid #E8EDF4',
        cursor: 'pointer',
        '&:hover .phase-add': { opacity: 1 },
      }}
    >
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          callbacks.onTogglePhase(row.phase?.id ?? null);
        }}
        sx={{ width: 24, height: 24, color: '#64748B', flexShrink: 0 }}
        aria-label={row.collapsed ? 'Expandir fase' : 'Contraer fase'}
      >
        {row.collapsed ? <ChevronRightRoundedIcon sx={{ fontSize: 18 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />}
      </IconButton>
      <Box sx={{ width: 3, height: 16, borderRadius: 2, backgroundColor: row.color, flexShrink: 0 }} />
      <Typography
        sx={{
          fontSize: 11.5,
          fontWeight: 720,
          letterSpacing: '-0.005em',
          color: '#1E293B',
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={row.name}
      >
        {row.name}
      </Typography>
      <Typography component="span" sx={{ fontSize: 10, color: '#A3B0C2', flexShrink: 0 }}>
        {row.activityCount}
      </Typography>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.8, flexShrink: 0 }}>
        {!compact && row.activityCount > 0 && (
          <>
            <LinearProgress
              variant="determinate"
              value={row.progress}
              sx={{
                width: 46,
                height: 4,
                backgroundColor: '#E9EEF5',
                '& .MuiLinearProgress-bar': { backgroundColor: row.color },
              }}
            />
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#94A3B8', width: 25, textAlign: 'right' }}>
              {row.progress}%
            </Typography>
          </>
        )}
        {!compact && !narrow && !row.collapsed && row.start && row.end && (
          <Typography sx={{ fontSize: 9.5, color: '#B0BBC9', display: { xs: 'none', lg: 'block' } }}>
            {formatShortDateNoYear(row.start)} – {formatShortDateNoYear(row.end)}
          </Typography>
        )}
        {!readOnly && (
          <IconButton
            className="phase-add"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              callbacks.onAddActivity(row.phase?.id ?? null);
            }}
            sx={{
              width: 24,
              height: 24,
              opacity: { xs: 1, lg: 0 },
              transition: 'opacity 120ms ease',
              color: row.color,
              '&:hover': { backgroundColor: `${row.color}14` },
            }}
            aria-label="Agregar actividad a la fase"
          >
            <AddRoundedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        )}
        {!readOnly && <RowMenu kind="phase" phase={row.phase} {...callbacks} />}
      </Box>
    </Box>
  );
}

function ActivityIcon({ row }: { row: ActivityRow }) {
  const status = ACTIVITY_STATUS[row.activity.status] ?? ACTIVITY_STATUS.pending;
  if (row.activity.type === 'milestone') {
    return <FlagRoundedIcon sx={{ fontSize: 14, color: row.activity.color || row.phaseColor }} />;
  }
  if (row.activity.type === 'summary') {
    return <FunctionsRoundedIcon sx={{ fontSize: 14, color: status.bar }} />;
  }
  if (row.activity.status === 'completed') {
    return <TaskAltRoundedIcon sx={{ fontSize: 14, color: status.bar }} />;
  }
  return (
    <Box
      sx={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: status.bar,
        flexShrink: 0,
        ml: 0.35,
      }}
    />
  );
}

function ActivityRowView({
  row,
  hovered,
  selected,
  compact,
  callbacks,
  readOnly,
}: {
  row: ActivityRow;
  hovered: boolean;
  selected: boolean;
  compact: boolean;
  callbacks: LeftTableCallbacks;
  readOnly: boolean;
}) {
  const activity = row.activity;
  const status = ACTIVITY_STATUS[activity.status] ?? ACTIVITY_STATUS.pending;
  const unitLabel = activity.durationUnit === 'calendar_day' ? 'días naturales' : 'días laborables';

  return (
    <Box
      onMouseEnter={() => callbacks.onHover(row.id)}
      onMouseLeave={() => callbacks.onHover(null)}
      onClick={() => callbacks.onOpenActivity(activity)}
      sx={{
        height: row.height,
        display: 'grid',
        gridTemplateColumns: compact ? COMPACT_COLUMNS : FULL_COLUMNS,
        alignItems: 'center',
        gap: compact ? 1 : 0.8,
        px: compact ? 1.4 : 1.6,
        backgroundColor: selected ? '#EEF2FF' : hovered ? '#F8FAFF' : '#FFFFFF',
        borderBottom: '1px solid #F1F5F9',
        cursor: 'pointer',
        position: 'relative',
        '&::before': selected
          ? { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, backgroundColor: '#6366F1' }
          : undefined,
        '&:hover .row-menu': { opacity: 1 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0, pl: row.depth * 2 }}>
        {row.depth > 0 && (
          <Box sx={{ width: 10, height: 1, backgroundColor: '#CBD5E1', flexShrink: 0, ml: -0.5 }} />
        )}
        <ActivityIcon row={row} />
        <Typography
          sx={{
            fontSize: 11.8,
            fontWeight: row.depth > 0 ? 500 : 560,
            color: activity.status === 'completed' ? '#64748B' : '#1E293B',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
            textDecoration: activity.status === 'completed' ? 'line-through' : 'none',
            textDecorationColor: '#CBD5E1',
          }}
          title={`${activity.name}\n${activity.startDate} → ${activity.endDate}\n${activity.duration} ${unitLabel}\nAvance: ${activity.progress}%`}
        >
          {activity.name}
        </Typography>
        {!compact && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.2, flexShrink: 0 }}>
            {!readOnly && <RowMenu kind="activity" activity={activity} {...callbacks} />}
          </Box>
        )}
      </Box>
      {compact ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: status.color }}>{activity.progress}%</Typography>
          <Box sx={{ width: 28, height: 4, borderRadius: 2, backgroundColor: '#EEF2F7', overflow: 'hidden' }}>
            <Box sx={{ width: `${activity.progress}%`, height: '100%', backgroundColor: status.bar }} />
          </Box>
        </Box>
      ) : (
        <>
          <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>{formatShortDateNoYear(activity.startDate)}</Typography>
          <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>{formatShortDateNoYear(activity.endDate)}</Typography>
          <Typography sx={{ fontSize: 10.5, color: '#64748B', textAlign: 'right' }} title={unitLabel}>
            {activity.type === 'milestone' ? '—' : `${activity.duration}d`}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, justifyContent: 'flex-end' }}>
            <Box sx={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#EEF2F7', overflow: 'hidden' }}>
              <Box sx={{ width: `${activity.progress}%`, height: '100%', backgroundColor: status.bar }} />
            </Box>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', width: 23, textAlign: 'right' }}>
              {activity.progress}%
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

export function LeftRows({
  rows,
  compact,
  selectedId,
  hoveredId,
  callbacks,
  onOpenPhase,
  readOnly = false,
  narrow = false,
}: {
  rows: GanttRow[];
  compact: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  callbacks: LeftTableCallbacks;
  onOpenPhase: (phase: Phase) => void;
  readOnly?: boolean;
  narrow?: boolean;
}) {
  return (
    <Box sx={{ width: '100%' }}>
      {rows.map((row) =>
        row.kind === 'phase' ? (
          <PhaseRowView
            key={row.id}
            row={row}
            hovered={hoveredId === row.id}
            compact={compact}
            narrow={narrow}
            callbacks={callbacks}
            onOpenPhase={onOpenPhase}
            readOnly={readOnly}
          />
        ) : (
          <ActivityRowView
            key={row.id}
            row={row}
            hovered={hoveredId === row.id}
            selected={selectedId === row.id}
            compact={compact}
            callbacks={callbacks}
            readOnly={readOnly}
          />
        ),
      )}
    </Box>
  );
}
