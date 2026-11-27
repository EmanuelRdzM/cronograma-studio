import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import PanToolRoundedIcon from '@mui/icons-material/PanToolRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ViewDayRoundedIcon from '@mui/icons-material/ViewDayRounded';
import ViewWeekRoundedIcon from '@mui/icons-material/ViewWeekRounded';
import CalendarViewMonthRoundedIcon from '@mui/icons-material/CalendarViewMonthRounded';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { Activity, Dependency, GanttScale, Phase, Project } from '@/api/types';
import {
  ACTIVITY_STATUS,
  PHASE_PALETTE,
} from '@/lib/labels';
import { WEEKDAYS_ES_SHORT, todayISO } from '@/lib/dates';
import {
  BASE_PX_PER_DAY,
  COMPACT_LEFT_WIDTH,
  LEFT_WIDTH,
  buildLayout,
  buildPhaseGroups,
  buildRows,
  dateCenterX,
  todayMarker,
} from './layout';
import { LeftHeader, LeftRows, type LeftTableCallbacks } from './LeftTable';
import { TimelineBody, TimelineHeader } from './Timeline';
import { useToast } from '@/components/ToastProvider';

const SCALE_OPTIONS: { value: GanttScale; label: string; icon: ReactNode }[] = [
  { value: 'day', label: 'Día', icon: <ViewDayRoundedIcon sx={{ fontSize: 16 }} /> },
  { value: 'week', label: 'Semana', icon: <ViewWeekRoundedIcon sx={{ fontSize: 16 }} /> },
  { value: 'month', label: 'Mes', icon: <CalendarViewMonthRoundedIcon sx={{ fontSize: 16 }} /> },
];

const MIN_TABLE_WIDTH = 380;
const TABLE_WIDTH_KEY = 'cronograma.table.width';

export interface GanttViewProps {
  project: Project;
  phases: Phase[];
  activities: Activity[];
  dependencies: Dependency[];
  readOnly?: boolean;
  initialScale?: GanttScale;
  selectedId?: string | null;
  onOpenActivity?: (activity: Activity) => void;
  onCreateActivity?: (options: { phaseId?: string | null; parentId?: string | null }) => void;
  onDuplicateActivity?: (activity: Activity) => void;
  onDeleteActivity?: (activity: Activity) => void;
  onMoveActivity?: (activity: Activity, direction: 'up' | 'down') => void;
  onEditPhase?: (phase: Phase) => void;
  onDeletePhase?: (phase: Phase) => void;
  onCreatePhase?: () => void;
  onDatesChange?: (activity: Activity, startDate: string, endDate: string) => void;
  onDependencyClick?: (dependency: Dependency) => void;
  footerLeft?: ReactNode;
  title?: ReactNode;
}

export function GanttView({
  project,
  phases,
  activities,
  dependencies,
  readOnly = false,
  initialScale,
  selectedId = null,
  onOpenActivity,
  onCreateActivity,
  onDuplicateActivity,
  onDeleteActivity,
  onMoveActivity,
  onEditPhase,
  onDeletePhase,
  onCreatePhase,
  onDatesChange,
  onDependencyClick,
  footerLeft,
  title,
}: GanttViewProps) {
  const theme = useTheme();
  const wide = useMediaQuery('(min-width:1360px)');
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const toast = useToast();
  const [scale, setScale] = useState<GanttScale>(initialScale ?? project.defaultScale ?? 'day');
  const [zoom, setZoom] = useState(1);
  const [showTable, setShowTable] = useState(!isPhone);
  const [tableWidth, setTableWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(TABLE_WIDTH_KEY));
      if (Number.isFinite(stored) && stored > 0) {
        return Math.min(LEFT_WIDTH, Math.max(MIN_TABLE_WIDTH, stored));
      }
    } catch {
      // almacenamiento no disponible
    }
    return LEFT_WIDTH;
  });
  const [resizingTable, setResizingTable] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [spacePan, setSpacePan] = useState(false);
  const [panning, setPanning] = useState(false);
  const panActive = panMode || spacePan;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`cronograma.collapsed.${project.id}`);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string | null>(selectedId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const suppressPanClickRef = useRef(false);
  const pointerOverGanttRef = useRef(false);
  const spacePanHeldRef = useRef(false);

  useEffect(() => {
    if (panActive) return;
    panDragRef.current = null;
    setPanning(false);
  }, [panActive]);

  useEffect(() => {
    const isTextEditingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('input, textarea, select, [contenteditable="true"]'),
      );
    };
    const hasModalOpen = () =>
      Boolean(document.querySelector('.MuiDialog-root, .MuiDrawer-root, .MuiModal-root'));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      // Mientras el modo mano está activo con Espacio, bloquea también los
      // eventos repetidos; si no, el navegador sigue haciendo scroll de página.
      if (spacePanHeldRef.current) {
        event.preventDefault();
        return;
      }
      if (event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (!pointerOverGanttRef.current) return;
      if (isTextEditingTarget(event.target) || hasModalOpen()) return;
      event.preventDefault();
      spacePanHeldRef.current = true;
      setSpacePan(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (spacePanHeldRef.current) event.preventDefault();
      spacePanHeldRef.current = false;
      setSpacePan(false);
    };
    const handleWindowBlur = () => {
      spacePanHeldRef.current = false;
      setSpacePan(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    setScale(initialScale ?? project.defaultScale ?? 'day');
    setZoom(1);
    setSearch('');
    setStatusFilter('all');
    setPhaseFilter('all');
    setInternalSelected(selectedId);
    setPanMode(false);
    setSpacePan(false);
    try {
      const raw = localStorage.getItem(`cronograma.collapsed.${project.id}`);
      setCollapsed(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setCollapsed(new Set());
    }
  }, [project.id]);

  useEffect(() => {
    setInternalSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    setShowTable(!isPhone);
  }, [isPhone]);

  useEffect(() => {
    try {
      localStorage.setItem(`cronograma.collapsed.${project.id}`, JSON.stringify(Array.from(collapsed)));
    } catch {
      // almacenamiento no disponible
    }
  }, [collapsed, project.id]);

  useEffect(() => {
    if (resizingTable) return;
    try {
      localStorage.setItem(TABLE_WIDTH_KEY, String(tableWidth));
    } catch {
      // almacenamiento no disponible
    }
  }, [tableWidth, resizingTable]);

  useEffect(() => {
    if (!resizingTable) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [resizingTable]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const leftWidth = showTable ? (wide ? tableWidth : COMPACT_LEFT_WIDTH) : 0;
  const narrowTable = wide && tableWidth < 520;
  const effectiveReadOnly = readOnly || panActive;

  const clampTableWidth = (width: number) =>
    Math.min(LEFT_WIDTH, Math.max(MIN_TABLE_WIDTH, width));

  const startTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!wide || !showTable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: tableWidth,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingTable(true);
  };

  const moveTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = resizeRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault();
    setTableWidth(clampTableWidth(current.startWidth + (event.clientX - current.startX)));
  };

  const endTableResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = resizeRef.current;
    if (!current) return;
    resizeRef.current = null;
    setResizingTable(false);
    if (event.currentTarget.hasPointerCapture(current.pointerId)) {
      event.currentTarget.releasePointerCapture(current.pointerId);
    }
  };

  const resetTableWidth = () => {
    setTableWidth(LEFT_WIDTH);
  };

  const handleTableResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!wide || !showTable) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 8;
    setTableWidth((current) =>
      clampTableWidth(current + (event.key === 'ArrowLeft' ? -step : step)),
    );
  };

  const renderTableResizeHandle = (accessible: boolean) => {
    if (!wide || !showTable) return null;
    return (
      <Box
        role="separator"
        aria-hidden={accessible ? undefined : true}
        aria-orientation="vertical"
        aria-label={accessible ? 'Ajustar ancho de la tabla' : undefined}
        aria-valuemin={accessible ? MIN_TABLE_WIDTH : undefined}
        aria-valuemax={accessible ? LEFT_WIDTH : undefined}
        aria-valuenow={accessible ? Math.round(tableWidth) : undefined}
        tabIndex={accessible ? 0 : -1}
        title="Arrastra hacia la izquierda para reducir la tabla. Doble clic para restaurar."
        onPointerDown={startTableResize}
        onPointerMove={moveTableResize}
        onPointerUp={endTableResize}
        onPointerCancel={endTableResize}
        onDoubleClick={resetTableWidth}
        onKeyDown={handleTableResizeKeyDown}
        sx={{
          position: 'absolute',
          top: 0,
          right: -4,
          width: 8,
          height: '100%',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'center',
          cursor: 'col-resize',
          touchAction: 'none',
          outline: 'none',
          '&::after': {
            content: '""',
            width: resizingTable ? 2 : 1,
            height: '100%',
            backgroundColor: resizingTable ? '#818CF8' : '#DCE4EE',
            transition: 'background-color 120ms ease, width 120ms ease',
          },
          '&:hover::after, &:focus-visible::after': {
            width: 2,
            backgroundColor: '#818CF8',
          },
        }}
      />
    );
  };

  const handlePanPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerOverGanttRef.current = true;
    if (!panActive || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;
    const container = event.currentTarget;
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      moved: false,
    };
    suppressPanClickRef.current = false;
    container.setPointerCapture(event.pointerId);
    setPanning(true);
    event.preventDefault();
  };

  const handlePanPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerOverGanttRef.current = true;
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) drag.moved = true;
    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
    event.currentTarget.scrollTop = drag.scrollTop - deltaY;
    event.preventDefault();
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag) return;
    if (drag.moved) {
      suppressPanClickRef.current = true;
      window.setTimeout(() => {
        suppressPanClickRef.current = false;
      }, 0);
    }
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    panDragRef.current = null;
    setPanning(false);
  };

  const handlePanClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!panActive || !suppressPanClickRef.current) return;
    suppressPanClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const groups = useMemo(
    () => buildPhaseGroups(phases, activities, collapsed, { search, status: statusFilter, phaseId: phaseFilter }),
    [phases, activities, collapsed, search, statusFilter, phaseFilter],
  );
  const rows = useMemo(() => buildRows(groups), [groups]);
  const layout = useMemo(() => buildLayout(project, activities, scale, zoom), [project, activities, scale, zoom]);
  const marker = useMemo(() => todayMarker(project), [project]);
  const calendar = useMemo(
    () => ({ workingDays: project.workingDays, holidays: project.holidays }),
    [project.workingDays, project.holidays],
  );

  const callbacks: LeftTableCallbacks = {
    onHover: setHoveredId,
    onOpenActivity: (activity) => {
      setInternalSelected(activity.id);
      if (!effectiveReadOnly) onOpenActivity?.(activity);
    },
    onDuplicateActivity: (activity) => onDuplicateActivity?.(activity),
    onDeleteActivity: (activity) => onDeleteActivity?.(activity),
    onAddSubactivity: (activity) =>
      onCreateActivity?.({ phaseId: activity.phaseId, parentId: activity.id }),
    onMoveActivity: (activity, direction) => onMoveActivity?.(activity, direction),
    onTogglePhase: (phaseId) => {
      if (!phaseId) return;
      setCollapsed((current) => {
        const next = new Set(current);
        if (next.has(phaseId)) next.delete(phaseId);
        else next.add(phaseId);
        return next;
      });
    },
    onAddActivity: (phaseId) => onCreateActivity?.({ phaseId }),
    onEditPhase: (phase) => onEditPhase?.(phase),
    onDeletePhase: (phase) => onDeletePhase?.(phase),
  };

  const scrollToToday = () => {
    const container = scrollRef.current;
    if (!container) return;
    const date = project.referenceDate || todayISO();
    const x = dateCenterX(date, layout);
    if (x < 0 || x > layout.width) {
      toast.toast('La fecha de hoy está fuera del rango visible del proyecto.', 'info');
      return;
    }
    const available = container.clientWidth - leftWidth;
    container.scrollTo({ left: Math.max(0, x - available / 2), behavior: 'smooth' });
  };

  const fit = () => {
    const container = scrollRef.current;
    if (!container) return;
    const available = Math.max(260, container.clientWidth - leftWidth - 24);
    const targetPxPerDay = available / layout.totalDays;
    const factor = targetPxPerDay / BASE_PX_PER_DAY[scale];
    setZoom(Math.max(0.4, Math.min(2.6, factor)));
    requestAnimationFrame(() => {
      container.scrollTo({ left: 0 });
    });
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    const container = scrollRef.current;
    const before = scrollRef.current;
    const centerTimelineX = before ? before.scrollLeft + Math.max(0, before.clientWidth - leftWidth) / 2 : 0;
    const nextZoom = Math.max(0.4, Math.min(2.6, zoom * (direction === 'in' ? 1.18 : 0.85)));
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      if (!container) return;
      const ratio = (BASE_PX_PER_DAY[scale] * nextZoom) / (BASE_PX_PER_DAY[scale] * zoom);
      container.scrollTo({ left: Math.max(0, centerTimelineX * ratio - Math.max(0, container.clientWidth - leftWidth) / 2) });
    });
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      toast.error('El navegador no permitió entrar en pantalla completa.');
    }
  };

  const handleScale = (next: GanttScale) => {
    setScale(next);
    setZoom(1);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: 0 }));
  };

  const visibleActivityCount = rows.filter((row) => row.kind === 'activity').length;
  const totalActivityCount = activities.length;
  const filtering = Boolean(search.trim()) || statusFilter !== 'all' || phaseFilter !== 'all';
  const phaseOptions = [
    ...phases.map((phase) => ({ id: phase.id, name: phase.name })),
    ...(activities.some((activity) => !activity.phaseId) ? [{ id: '__orphans__', name: 'Sin fase' }] : []),
  ];

  const workingDayNames = project.workingDays
    .slice()
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((day) => WEEKDAYS_ES_SHORT[day])
    .join(' · ');

  return (
    <Box
      ref={rootRef}
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isFullscreen ? 0 : 3,
        border: isFullscreen ? 'none' : '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: isFullscreen ? 'none' : '0 1px 2px rgba(15,23,42,.04)',
      }}
    >
      <Box
        sx={{
          px: { xs: 1.2, md: 1.6 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          borderBottom: '1px solid #E8EDF4',
          backgroundColor: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, p: 0.35, borderRadius: 2, backgroundColor: '#F4F6FA', border: '1px solid #E8EDF4' }}>
          {SCALE_OPTIONS.map((option) => {
            const active = scale === option.value;
            return (
              <Tooltip key={option.value} title={`Vista ${option.label.toLowerCase()}`}>
                <ButtonBase
                  onClick={() => handleScale(option.value)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1.1,
                    py: 0.55,
                    borderRadius: 1.5,
                    fontSize: 11.5,
                    fontWeight: active ? 700 : 550,
                    color: active ? '#3730A3' : '#64748B',
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                    boxShadow: active ? '0 1px 3px rgba(15,23,42,.10)' : 'none',
                    '&:hover': { color: '#3730A3' },
                  }}
                >
                  {option.icon}
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{option.label}</Box>
                </ButtonBase>
              </Tooltip>
            );
          })}
        </Box>

        <Tooltip title="Ir a hoy">
          <IconButton size="small" onClick={scrollToToday} sx={{ color: '#64748B' }}>
            <TodayRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ajustar todo el proyecto a la pantalla">
          <IconButton size="small" onClick={fit} sx={{ color: '#64748B' }}>
            <FitScreenRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #E8EDF4', borderRadius: 2, px: 0.2 }}>
          <Tooltip title="Alejar">
            <IconButton size="small" onClick={() => adjustZoom('out')} sx={{ color: '#64748B' }}>
              <ZoomOutRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Acercar">
            <IconButton size="small" onClick={() => adjustZoom('in')} sx={{ color: '#64748B' }}>
              <ZoomInRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Tooltip title={showTable ? 'Ocultar tabla de actividades' : 'Mostrar tabla de actividades'}>
          <IconButton
            size="small"
            onClick={() => setShowTable((value) => !value)}
            sx={{
              color: showTable ? '#4F46E5' : '#64748B',
              backgroundColor: showTable ? '#EEF2FF' : 'transparent',
              '&:hover': { backgroundColor: showTable ? '#E0E7FF' : undefined },
            }}
          >
            <ViewSidebarRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={panMode ? 'Desactivar modo mano' : 'Desplazar con arrastre · mantén Espacio sobre el diagrama'}>
          <IconButton
            size="small"
            onClick={() => setPanMode((value) => !value)}
            aria-label={panMode ? 'Desactivar modo mano' : 'Activar modo mano'}
            aria-pressed={panMode}
            aria-keyshortcuts="Space"
            sx={{
              color: panActive ? '#4F46E5' : '#64748B',
              backgroundColor: panActive ? '#EEF2FF' : 'transparent',
              '&:hover': { backgroundColor: panActive ? '#E0E7FF' : undefined },
            }}
          >
            <PanToolRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.3, ml: 0.8 }}>
          <Tooltip title="Contraer todas las fases">
            <IconButton
              size="small"
              onClick={() => setCollapsed(new Set(phases.map((phase) => phase.id)))}
              sx={{ color: '#64748B' }}
            >
              <UnfoldLessRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Expandir todas las fases">
            <IconButton size="small" onClick={() => setCollapsed(new Set())} sx={{ color: '#64748B' }}>
              <UnfoldMoreRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.4, my: 0.6, display: { xs: 'none', lg: 'block' } }} />

        <Box sx={{ ml: { xs: 0, lg: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar actividad…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: 150, sm: 185 }, '& .MuiOutlinedInput-root': { height: 32, fontSize: 12, backgroundColor: '#FBFCFE' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                </InputAdornment>
              ),
            }}
          />
          <Select
            size="small"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            sx={{ height: 32, fontSize: 11.5, backgroundColor: '#FBFCFE', minWidth: 118, '& fieldset': { borderColor: '#E2E8F0' } }}
          >
            <MenuItem value="all">Todo estado</MenuItem>
            {Object.entries(ACTIVITY_STATUS).map(([value, meta]) => (
              <MenuItem key={value} value={value}>
                {meta.label}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={phaseFilter}
            onChange={(event) => setPhaseFilter(event.target.value)}
            sx={{ height: 32, fontSize: 11.5, backgroundColor: '#FBFCFE', minWidth: 128, maxWidth: 170, '& fieldset': { borderColor: '#E2E8F0' } }}
          >
            <MenuItem value="all">Todas las fases</MenuItem>
            {phaseOptions.map((phase) => (
              <MenuItem key={phase.id} value={phase.id}>
                {phase.name}
              </MenuItem>
            ))}
          </Select>
          <Typography sx={{ fontSize: 10.5, color: '#94A3B8', display: { xs: 'none', xl: 'block' } }}>
            {filtering ? `${visibleActivityCount} de ${totalActivityCount}` : `${totalActivityCount} actividades`}
          </Typography>
          <Tooltip title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            <IconButton size="small" onClick={toggleFullscreen} sx={{ color: '#64748B' }}>
              {isFullscreen ? <FullscreenExitRoundedIcon sx={{ fontSize: 19 }} /> : <FullscreenRoundedIcon sx={{ fontSize: 19 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {rows.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 260,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 3,
            backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(79,70,229,.04), transparent 55%)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.6, mb: 2 }}>
            {PHASE_PALETTE.slice(0, 5).map((color, index) => (
              <Box key={color} sx={{ width: 46 - index * 6, height: 7, borderRadius: 4, backgroundColor: color, opacity: 0.75 }} />
            ))}
          </Box>
          <Typography sx={{ fontSize: 17, fontWeight: 720, color: '#0F172A' }}>
            {filtering ? 'No hay actividades con esos filtros' : 'Tu cronograma está en blanco'}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.8, maxWidth: 360 }}>
            {filtering
              ? 'Prueba con otra búsqueda, estado o fase.'
              : effectiveReadOnly
                ? 'Este proyecto todavía no tiene actividades.'
                : 'Crea una fase para organizar el trabajo y después agrega actividades con fechas, duración y avance.'}
          </Typography>
          {filtering ? (
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPhaseFilter('all');
              }}
            >
              Limpiar filtros
            </Button>
          ) : (
            !effectiveReadOnly && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2.3 }}>
                {onCreatePhase && (
                  <Button variant="outlined" size="small" onClick={onCreatePhase} startIcon={<AddRoundedIcon />}>
                    Nueva fase
                  </Button>
                )}
                {onCreateActivity && (
                  <Button variant="contained" size="small" onClick={() => onCreateActivity({})} startIcon={<AddRoundedIcon />}>
                    Nueva actividad
                  </Button>
                )}
              </Box>
            )
          )}
        </Box>
      ) : (
        <Box
          ref={scrollRef}
          className="gantt-scroll"
          onPointerDown={handlePanPointerDown}
          onPointerMove={handlePanPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onPointerEnter={() => {
            pointerOverGanttRef.current = true;
          }}
          onPointerLeave={() => {
            pointerOverGanttRef.current = false;
          }}
          onClickCapture={handlePanClickCapture}
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            position: 'relative',
            cursor: panActive ? (panning ? 'grabbing' : 'grab') : 'default',
            userSelect: panActive ? 'none' : undefined,
            touchAction: panActive ? 'none' : 'auto',
            ...(panActive
              ? {
                  '& *:not(button):not(a):not(input):not(select):not(textarea):not([role="button"]):not([role="separator"])': {
                    cursor: 'inherit !important',
                  },
                }
              : {}),
          }}
        >
          <Box sx={{ width: leftWidth + layout.width, minWidth: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                position: 'sticky',
                top: 0,
                zIndex: 8,
                backgroundColor: '#FBFCFE',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <Box
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 9,
                  width: leftWidth,
                  flexShrink: 0,
                  backgroundColor: '#FBFCFE',
                  boxShadow: '7px 0 12px -14px rgba(15,23,42,.35)',
                  display: showTable ? 'block' : 'none',
                }}
              >
                <LeftHeader compact={!wide} panMode={panActive} narrow={narrowTable} />
                {renderTableResizeHandle(true)}
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <TimelineHeader layout={layout} marker={marker} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Box
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 5,
                  width: leftWidth,
                  flexShrink: 0,
                  backgroundColor: '#FFFFFF',
                  boxShadow: '7px 0 12px -14px rgba(15,23,42,.35)',
                  display: showTable ? 'block' : 'none',
                }}
              >
                <LeftRows
                  rows={rows}
                  compact={!wide}
                  selectedId={internalSelected}
                  hoveredId={hoveredId}
                  callbacks={callbacks}
                  onOpenPhase={(phase) => {
                    if (!effectiveReadOnly) onEditPhase?.(phase);
                  }}
                  readOnly={effectiveReadOnly}
                  narrow={narrowTable}
                />
                {renderTableResizeHandle(false)}
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <TimelineBody
                  layout={layout}
                  rows={rows}
                  dependencies={dependencies}
                  calendar={calendar}
                  marker={marker}
                  selectedId={internalSelected}
                  hoveredId={hoveredId}
                  readOnly={effectiveReadOnly}
                  onHover={setHoveredId}
                  onOpenActivity={(activity) => {
                    setInternalSelected(activity.id);
                    if (!effectiveReadOnly) onOpenActivity?.(activity);
                  }}
                  onDatesChange={(activity, startDate, endDate) => onDatesChange?.(activity, startDate, endDate)}
                  onDependencyClick={effectiveReadOnly ? undefined : onDependencyClick}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          px: { xs: 1.4, md: 1.8 },
          py: 0.7,
          borderTop: '1px solid #E8EDF4',
          backgroundColor: '#FBFCFE',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          flexShrink: 0,
          minHeight: 34,
        }}
      >
        {footerLeft}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: '#10B981' }} />
          <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>Completada</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: '#F59E0B' }} />
          <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>En progreso</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 16, height: 4, borderRadius: 2, backgroundColor: '#94A3B8' }} />
          <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>Pendiente</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 1.5, height: 10, backgroundColor: '#F59E0B' }} />
          <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>{project.referenceDate ? 'Referencia' : 'Hoy'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, displayPrint: 'none' }}>
          <Box sx={{ width: 16, height: 1, backgroundColor: '#94A3B8', position: 'relative', '&::after': { content: '""', position: 'absolute', right: -1, top: -2.5, borderLeft: '4px solid #94A3B8', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' } }} />
          <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>Dependencia</Typography>
        </Box>
        <Typography sx={{ ml: 'auto', fontSize: 9.5, color: '#B0BBC9' }}>
          Días laborables: {workingDayNames || 'sin configurar'}
          {project.holidays.length > 0 ? ` · ${project.holidays.length} festivo${project.holidays.length === 1 ? '' : 's'}` : ''}
        </Typography>
      </Box>
    </Box>
  );
}
