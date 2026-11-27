import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Tooltip from '@mui/material/Tooltip';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import FunctionsRoundedIcon from '@mui/icons-material/FunctionsRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import type {
  Activity,
  ActivityPriority,
  ActivityStatus,
  ActivityType,
  Dependency,
  DurationUnit,
  Phase,
  Project,
} from '@/api/types';
import {
  ACTIVITY_PRIORITY,
  ACTIVITY_STATUS,
  ACTIVITY_TYPE,
  PHASE_PALETTE,
} from '@/lib/labels';
import {
  calendarFromProject,
  countDuration,
  endDateFromDuration,
  nextWorkingDay,
  snapToWorkingDay,
} from '@/lib/calendar';
import { formatShortDate, isISODate, todayISO, WEEKDAYS_ES } from '@/lib/dates';

export interface ActivityFormValues {
  name: string;
  description: string;
  phaseId: string;
  parentId: string;
  type: ActivityType;
  startDate: string;
  endDate: string;
  duration: number;
  durationUnit: DurationUnit;
  progress: number;
  status: ActivityStatus;
  priority: ActivityPriority;
  color: string | null;
  assignee: string;
  notes: string;
}

const schema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(240),
    description: z.string().max(4000),
    phaseId: z.string(),
    parentId: z.string(),
    type: z.enum(['task', 'summary', 'milestone']),
    startDate: z.string().refine(isISODate, 'Fecha inválida'),
    endDate: z.string().refine(isISODate, 'Fecha inválida'),
    duration: z.number().min(0).max(20_000),
    durationUnit: z.enum(['working_day', 'calendar_day']),
    progress: z.number().min(0).max(100),
    status: z.enum(['pending', 'in_progress', 'blocked', 'completed']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    color: z.string().nullable(),
    assignee: z.string().max(120),
    notes: z.string().max(10_000),
  })
  .superRefine((data, context) => {
    if (data.type !== 'milestone' && data.endDate < data.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'El fin no puede ser anterior al inicio',
      });
    }
    if (data.type !== 'milestone' && data.duration < 1) {
      context.addIssue({
        code: 'custom',
        path: ['duration'],
        message: 'La duración debe ser al menos 1 día',
      });
    }
  });

interface ActivityDrawerProps {
  open: boolean;
  project: Project;
  phases: Phase[];
  activities: Activity[];
  dependencies: Dependency[];
  activity?: Activity | null;
  defaults?: { phaseId?: string | null; parentId?: string | null };
  saving?: boolean;
  serverError?: string;
  onClose: () => void;
  onSubmit: (values: ActivityFormValues, predecessorIds: string[]) => void;
  onDelete?: (activity: Activity) => void;
  onDuplicate?: (activity: Activity) => void;
}

export function ActivityDrawer({
  open,
  project,
  phases,
  activities,
  dependencies,
  activity,
  defaults,
  saving = false,
  serverError,
  onClose,
  onSubmit,
  onDelete,
  onDuplicate,
}: ActivityDrawerProps) {
  const calendar = useMemo(() => calendarFromProject(project), [project]);
  const [predecessorIds, setPredecessorIds] = useState<string[]>([]);
  const [colorValue, setColorValue] = useState<string | null>(null);
  const editing = Boolean(activity);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      phaseId: 'none',
      parentId: 'none',
      type: 'task',
      startDate: todayISO(),
      endDate: todayISO(),
      duration: 1,
      durationUnit: 'working_day',
      progress: 0,
      status: 'pending',
      priority: 'medium',
      color: null,
      assignee: '',
      notes: '',
    },
  });

  const type = watch('type');
  const unit = watch('durationUnit');
  const startDate = watch('startDate');
  const progress = watch('progress');

  useEffect(() => {
    if (!open) return;
    let initialStart = todayISO();
    let initialPhase = defaults?.phaseId ?? 'none';
    let initialParent = defaults?.parentId ?? 'none';
    let initialDuration = 1;
    let initialType: ActivityType = 'task';
    let initialProgress = 0;
    let initialStatus: ActivityStatus = 'pending';

    if (activity) {
      initialStart = activity.startDate;
      initialPhase = activity.phaseId ?? 'none';
      initialParent = activity.parentId ?? 'none';
      initialDuration = activity.duration;
      initialType = activity.type;
      initialProgress = activity.progress;
      initialStatus = activity.status;
      setPredecessorIds(
        dependencies
          .filter((dependency) => dependency.successorId === activity.id && dependency.type === 'FS')
          .map((dependency) => dependency.predecessorId),
      );
      setColorValue(activity.color);
      reset({
        name: activity.name,
        description: activity.description ?? '',
        phaseId: activity.phaseId ?? 'none',
        parentId: activity.parentId ?? 'none',
        type: activity.type,
        startDate: activity.startDate,
        endDate: activity.endDate,
        duration: activity.duration,
        durationUnit: activity.durationUnit,
        progress: activity.progress,
        status: activity.status,
        priority: activity.priority,
        color: activity.color,
        assignee: activity.assignee ?? '',
        notes: activity.notes ?? '',
      });
      return;
    }

    const parent = activities.find((item) => item.id === defaults?.parentId);
    if (parent) {
      initialStart = nextWorkingDay(parent.endDate, calendar);
      initialDuration = 1;
    } else if (defaults?.phaseId) {
      const phaseActivities = activities.filter(
        (item) => item.phaseId === defaults.phaseId && item.type !== 'milestone',
      );
      if (phaseActivities.length) {
        const lastEnd = phaseActivities.map((item) => item.endDate).sort().at(-1)!;
        initialStart = nextWorkingDay(lastEnd, calendar);
      }
    }
    initialStart = snapToWorkingDay(initialStart, calendar);
    const initialEnd = endDateFromDuration(initialStart, initialDuration, calendar, 'working_day');
    setPredecessorIds([]);
    setColorValue(null);
    reset({
      name: '',
      description: '',
      phaseId: initialPhase,
      parentId: initialParent,
      type: initialType,
      startDate: initialStart,
      endDate: initialEnd,
      duration: initialDuration,
      durationUnit: 'working_day',
      progress: initialProgress,
      status: initialStatus,
      priority: 'medium',
      color: null,
      assignee: '',
      notes: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activity?.id, defaults?.phaseId, defaults?.parentId, activities.length]);

  const handleStartChange = (value: string) => {
    if (!isISODate(value)) return;
    const start = unit === 'working_day' ? snapToWorkingDay(value, calendar) : value;
    setValue('startDate', start, { shouldValidate: true });
    if (type === 'milestone') {
      setValue('endDate', start, { shouldValidate: true });
      setValue('duration', 0);
      return;
    }
    const duration = Math.max(1, Number(watch('duration')) || 1);
    const end = endDateFromDuration(start, duration, calendar, unit);
    setValue('endDate', end, { shouldValidate: true });
  };

  const handleEndChange = (value: string) => {
    if (!isISODate(value)) return;
    const end = unit === 'working_day' ? snapToWorkingDay(value, calendar) : value;
    const start = watch('startDate');
    setValue('endDate', end, { shouldValidate: true });
    if (end < start) {
      setError('endDate', { type: 'manual', message: 'El fin no puede ser anterior al inicio' });
      return;
    }
    clearErrors('endDate');
    const duration = Math.max(1, countDuration(start, end, calendar, unit));
    setValue('duration', duration);
  };

  const handleDurationChange = (raw: string) => {
    const duration = Math.max(1, Math.min(20_000, Number(raw) || 1));
    setValue('duration', duration, { shouldValidate: true });
    if (type === 'milestone') return;
    const end = endDateFromDuration(watch('startDate'), duration, calendar, unit);
    setValue('endDate', end, { shouldValidate: true });
  };

  const handleTypeChange = (next: ActivityType) => {
    setValue('type', next);
    if (next === 'milestone') {
      setValue('endDate', watch('startDate'));
      setValue('duration', 0);
      setValue('progress', 100);
      setValue('status', 'completed');
    } else if (type === 'milestone') {
      const end = endDateFromDuration(watch('startDate'), 1, calendar, unit);
      setValue('duration', 1);
      setValue('endDate', end);
      setValue('progress', 0);
      setValue('status', 'pending');
    }
  };

  const handleUnitChange = (next: DurationUnit) => {
    setValue('durationUnit', next);
    if (type === 'milestone') return;
    const duration = Math.max(1, Number(watch('duration')) || 1);
    const end = endDateFromDuration(watch('startDate'), duration, calendar, next);
    setValue('endDate', end, { shouldValidate: true });
  };

  const handleParentChange = (value: string) => {
    setValue('parentId', value);
    if (value === 'none') return;
    const parent = activities.find((item) => item.id === value);
    if (!parent) return;
    setValue('phaseId', parent.phaseId ?? 'none');
    const start = nextWorkingDay(parent.endDate, calendar);
    handleStartChange(start);
    if (!editing) {
      setValue('name', '');
    }
  };

  const descendantIds = useMemo(() => {
    if (!activity) return new Set<string>();
    const result = new Set<string>();
    const walk = (parentId: string) => {
      for (const item of activities) {
        if (item.parentId === parentId && !result.has(item.id)) {
          result.add(item.id);
          walk(item.id);
        }
      }
    };
    walk(activity.id);
    return result;
  }, [activity, activities]);

  const dependencyOptions = activities.filter(
    (item) => item.id !== activity?.id && !descendantIds.has(item.id),
  );
  const selectedPredecessors = dependencyOptions.filter((item) => predecessorIds.includes(item.id));
  const dependencyWarnings = selectedPredecessors.filter(
    (predecessor) => predecessor.endDate >= startDate,
  );
  const parentOptions = activities.filter(
    (item) => item.id !== activity?.id && !descendantIds.has(item.id),
  );
  const nonWorkingDays = [0, 1, 2, 3, 4, 5, 6]
    .filter((day) => !project.workingDays.includes(day))
    .map((day) => WEEKDAYS_ES[day])
    .join(', ');

  const submit = handleSubmit((values) => {
    onSubmit(
      {
        ...values,
        phaseId: values.phaseId === 'none' ? '' : values.phaseId,
        parentId: values.parentId === 'none' ? '' : values.parentId,
        color: colorValue,
      },
      predecessorIds,
    );
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={saving ? undefined : onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 470 },
            maxWidth: '100vw',
            borderLeft: '1px solid #E2E8F0',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ px: 3, pt: 2.4, pb: 1.8, borderBottom: '1px solid #EEF2F7' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.6,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
              }}
            >
              {type === 'milestone' ? (
                <FlagRoundedIcon sx={{ fontSize: 17 }} />
              ) : type === 'summary' ? (
                <FunctionsRoundedIcon sx={{ fontSize: 17 }} />
              ) : (
                <TaskAltRoundedIcon sx={{ fontSize: 17 }} />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 730, letterSpacing: '-0.02em', color: '#0F172A' }}>
                {editing ? 'Editar actividad' : 'Nueva actividad'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>
                {project.name}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} disabled={saving} aria-label="Cerrar">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.4 }}>
          {serverError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12.5 }}>
              {serverError}
            </Alert>
          )}
          {dependencyWarnings.length > 0 && (
            <Alert severity="info" sx={{ mb: 2, fontSize: 11.5 }}>
              {project.schedulingMode === 'automatic'
                ? 'Al guardar, esta actividad se reprogramará según sus dependencias si el modo automático está activo.'
                : 'Las fechas de esta actividad se solapan con una predecesora. El modo manual no mueve fechas automáticamente.'}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Nombre de la actividad"
                  placeholder="Ej. Revisión de calidad"
                  autoFocus
                  {...field}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Controller
                name="phaseId"
                control={control}
                render={({ field }) => (
                  <TextField select label="Fase" {...field}>
                    <MenuItem value="none">Sin fase</MenuItem>
                    {phases.map((phase) => (
                      <MenuItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <TextField select label="Actividad padre" {...field} onChange={(event) => handleParentChange(event.target.value)}>
                    <MenuItem value="none">Ninguna</MenuItem>
                    {parentOptions.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>

            <Divider />

            <Box>
              <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase', mb: 1 }}>
                Calendario y duración
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Inicio"
                      type="date"
                      value={field.value}
                      onChange={(event) => handleStartChange(event.target.value)}
                      onBlur={field.onBlur}
                      InputLabelProps={{ shrink: true }}
                      error={Boolean(errors.startDate)}
                      helperText={errors.startDate?.message}
                      className="date-input"
                    />
                  )}
                />
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Fin"
                      type="date"
                      value={field.value}
                      onChange={(event) => handleEndChange(event.target.value)}
                      onBlur={field.onBlur}
                      InputLabelProps={{ shrink: true }}
                      disabled={type === 'milestone'}
                      error={Boolean(errors.endDate)}
                      helperText={type === 'milestone' ? 'El hito usa una sola fecha' : errors.endDate?.message}
                      className="date-input"
                    />
                  )}
                />
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Duración"
                      type="number"
                      value={type === 'milestone' ? 0 : field.value}
                      onChange={(event) => handleDurationChange(event.target.value)}
                      disabled={type === 'milestone'}
                      InputProps={{ endAdornment: <Typography sx={{ fontSize: 10.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>días</Typography> }}
                      error={Boolean(errors.duration)}
                      helperText={errors.duration?.message || (type === 'milestone' ? 'Hito: 0 días' : undefined)}
                    />
                  )}
                />
                <Controller
                  name="durationUnit"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Tipo de días" {...field} onChange={(event) => handleUnitChange(event.target.value as DurationUnit)} disabled={type === 'milestone'}>
                      <MenuItem value="working_day">Laborables</MenuItem>
                      <MenuItem value="calendar_day">Naturales</MenuItem>
                    </TextField>
                  )}
                />
              </Box>
              <Typography sx={{ fontSize: 10, color: '#A3B0C2', mt: 0.8 }}>
                {nonWorkingDays
                  ? `No se cuentan: ${nonWorkingDays}${project.holidays.length ? ' ni los festivos configurados' : ''}.`
                  : 'El calendario no tiene días cerrados; se cuentan todos los días.'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.4 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Avance
                </Typography>
                <Typography sx={{ fontSize: 12.5, fontWeight: 750, color: ACTIVITY_STATUS[watch('status')]?.color }}>
                  {progress}%
                </Typography>
              </Box>
              <Controller
                name="progress"
                control={control}
                render={({ field }) => (
                  <Slider
                    value={field.value}
                    onChange={(_event, value) => {
                      const numeric = Array.isArray(value) ? value[0] : value;
                      field.onChange(numeric);
                      if (numeric === 100) setValue('status', 'completed');
                      else if (numeric > 0 && watch('status') === 'pending') setValue('status', 'in_progress');
                      else if (numeric < 100 && watch('status') === 'completed') setValue('status', 'in_progress');
                    }}
                    step={5}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                    ]}
                    sx={{ mx: 0.5, width: 'calc(100% - 8px)' }}
                  />
                )}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.2 }}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Estado" {...field}>
                      {Object.entries(ACTIVITY_STATUS).map(([value, meta]) => (
                        <MenuItem key={value} value={value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: meta.bar }} />
                            {meta.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Tipo" {...field} onChange={(event) => handleTypeChange(event.target.value as ActivityType)}>
                      {Object.entries(ACTIVITY_TYPE).map(([value, meta]) => (
                        <MenuItem key={value} value={value}>
                          {meta.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Box>
            </Box>

            <Divider />

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                <LinkRoundedIcon sx={{ fontSize: 15, color: '#64748B' }} />
                <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Dependencias
                </Typography>
              </Box>
              <Autocomplete
                multiple
                options={dependencyOptions}
                value={selectedPredecessors}
                onChange={(_event, value) => setPredecessorIds(value.map((item) => item.id))}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderOption={(props, option) => (
                  <Box component="li" {...props} key={option.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: option.color || '#94A3B8' }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12, color: '#334155' }} noWrap>
                        {option.name}
                      </Typography>
                      <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>
                        {formatShortDate(option.startDate)} → {formatShortDate(option.endDate)}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        {...tagProps}
                        label={option.name}
                        size="small"
                        sx={{
                          height: 23,
                          m: 0.2,
                          fontSize: 10,
                          fontWeight: 600,
                          backgroundColor: '#EEF2FF',
                          color: '#3730A3',
                          '& .MuiChip-deleteIcon': { fontSize: 14, color: '#6366F1' },
                        }}
                      />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={selectedPredecessors.length ? undefined : 'Selecciona actividades predecesoras'}
                    helperText="Fin → Inicio. La actividad inicia después de que terminen sus predecesoras."
                  />
                )}
                noOptionsText="No hay actividades disponibles"
              />
              {dependencyWarnings.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {dependencyWarnings.map((predecessor) => (
                    <Typography key={predecessor.id} sx={{ fontSize: 10.5, color: '#B45309' }}>
                      «{predecessor.name}» termina el {formatShortDate(predecessor.endDate)}, después de este inicio.
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>

            <Accordion
              disableGutters
              elevation={0}
              sx={{ border: '1px solid #E8EDF4', borderRadius: 2, '&:before': { display: 'none' }, backgroundColor: '#FBFCFE' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 40, px: 1.5 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#475569' }}>Más opciones</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 1.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.8 }}>
                <TextField label="Descripción" multiline minRows={2} {...register('description')} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <TextField select label="Prioridad" {...field}>
                        {Object.entries(ACTIVITY_PRIORITY).map(([value, meta]) => (
                          <MenuItem key={value} value={value}>
                            {meta.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  <TextField label="Responsable" placeholder="Nombre" {...register('assignee')} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 650, color: '#64748B', mb: 0.7 }}>Color de la barra</Typography>
                  <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Tooltip title="Heredar color de la fase">
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setColorValue(null)}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          border: '1px dashed #CBD5E1',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 9,
                          color: '#94A3B8',
                          boxShadow: colorValue === null ? '0 0 0 2px #4F46E5' : 'none',
                        }}
                      >
                        A
                      </Box>
                    </Tooltip>
                    {PHASE_PALETTE.map((color) => (
                      <Box
                        key={color}
                        component="button"
                        type="button"
                        onClick={() => setColorValue(color)}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          border: 'none',
                          backgroundColor: color,
                          cursor: 'pointer',
                          boxShadow: colorValue === color ? '0 0 0 2px #fff, 0 0 0 4px #4F46E5' : 'none',
                        }}
                        aria-label={`Color ${color}`}
                      />
                    ))}
                    <Box
                      component="input"
                      type="color"
                      value={colorValue ?? '#4F46E5'}
                      onChange={(event) => setColorValue(event.target.value)}
                      sx={{ width: 28, height: 24, border: '1px solid #E2E8F0', borderRadius: 1, p: 0.2, cursor: 'pointer', backgroundColor: '#fff' }}
                      title="Color personalizado"
                    />
                  </Box>
                </Box>
                <TextField label="Notas internas" multiline minRows={2} {...register('notes')} />
              </AccordionDetails>
            </Accordion>

            {editing && activity && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#B0BBC9', pt: 0.5 }}>
                <EventRoundedIcon sx={{ fontSize: 13 }} />
                <Typography sx={{ fontSize: 9.5 }}>
                  Creada {new Date(activity.createdAt).toLocaleDateString('es-MX')} · Última edición{' '}
                  {new Date(activity.updatedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ px: 3, py: 1.8, borderTop: '1px solid #EEF2F7', backgroundColor: '#FBFCFE', display: 'flex', alignItems: 'center', gap: 0.8 }}>
          {editing && activity && (
            <>
              <Tooltip title="Duplicar actividad">
                <IconButton size="small" onClick={() => onDuplicate?.(activity)} disabled={saving} sx={{ color: '#64748B' }}>
                  <ContentCopyRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar actividad">
                <IconButton size="small" onClick={() => onDelete?.(activity)} disabled={saving} sx={{ color: '#DC2626' }}>
                  <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Box sx={{ flex: 1 }} />
          <Button color="inherit" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submit} disabled={saving} sx={{ minWidth: 112 }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : editing ? 'Guardar cambios' : 'Crear actividad'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
