import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { Activity, GanttScale, Project, ProjectStatus, SchedulingMode } from '@/api/types';
import { PROJECT_STATUS } from '@/lib/labels';
import { formatLongDate, todayISO } from '@/lib/dates';

export interface ProjectSettingsValues {
  name: string;
  description: string;
  code: string;
  status: ProjectStatus;
  color: string;
  startDate: string;
  timezone: string;
  schedulingMode: SchedulingMode;
  workingDays: number[];
  holidays: string[];
  showToday: boolean;
  referenceDate: string;
  defaultScale: GanttScale;
}

const DAYS = [
  { value: 1, label: 'L', name: 'Lunes' },
  { value: 2, label: 'M', name: 'Martes' },
  { value: 3, label: 'X', name: 'Miércoles' },
  { value: 4, label: 'J', name: 'Jueves' },
  { value: 5, label: 'V', name: 'Viernes' },
  { value: 6, label: 'S', name: 'Sábado' },
  { value: 0, label: 'D', name: 'Domingo' },
];

const COLORS = ['#4F46E5', '#0E7490', '#047857', '#B45309', '#BE123C', '#7C3AED', '#0F766E', '#475569'];

interface ProjectSettingsDialogProps {
  open: boolean;
  project: Project;
  saving?: boolean;
  serverError?: string;
  onClose: () => void;
  onSubmit: (values: ProjectSettingsValues) => void;
}

export function ProjectSettingsDialog({
  open,
  project,
  saving = false,
  serverError,
  onClose,
  onSubmit,
}: ProjectSettingsDialogProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [code, setCode] = useState(project.code ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [color, setColor] = useState(project.color);
  const [startDate, setStartDate] = useState(project.startDate);
  const [timezone, setTimezone] = useState(project.timezone);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>(project.schedulingMode);
  const [workingDays, setWorkingDays] = useState<number[]>(project.workingDays);
  const [holidays, setHolidays] = useState<string[]>(project.holidays);
  const [showToday, setShowToday] = useState(project.showToday);
  const [referenceDate, setReferenceDate] = useState(project.referenceDate ?? '');
  const [defaultScale, setDefaultScale] = useState<GanttScale>(project.defaultScale);
  const [holidayDraft, setHolidayDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setDescription(project.description ?? '');
    setCode(project.code ?? '');
    setStatus(project.status);
    setColor(project.color);
    setStartDate(project.startDate);
    setTimezone(project.timezone);
    setSchedulingMode(project.schedulingMode);
    setWorkingDays(project.workingDays);
    setHolidays(project.holidays);
    setShowToday(project.showToday);
    setReferenceDate(project.referenceDate ?? '');
    setDefaultScale(project.defaultScale);
    setHolidayDraft('');
    setError('');
  }, [open, project]);

  const toggleDay = (day: number) => {
    setWorkingDays((current) => {
      if (current.includes(day)) {
        if (current.length === 1) {
          setError('Debe existir al menos un día laborable.');
          return current;
        }
        setError('');
        return current.filter((item) => item !== day);
      }
      setError('');
      return [...current, day].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
    });
  };

  const addHoliday = () => {
    if (!holidayDraft) return;
    if (holidays.includes(holidayDraft)) {
      setHolidayDraft('');
      return;
    }
    setHolidays((current) => [...current, holidayDraft].sort());
    setHolidayDraft('');
  };

  const submit = () => {
    if (!name.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }
    if (!startDate) {
      setError('Selecciona una fecha de inicio.');
      return;
    }
    if (workingDays.length === 0) {
      setError('Debe existir al menos un día laborable.');
      return;
    }
    onSubmit({
      name: name.trim(),
      description,
      code,
      status,
      color,
      startDate,
      timezone,
      schedulingMode,
      workingDays,
      holidays,
      showToday,
      referenceDate,
      defaultScale,
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configuración del proyecto</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.4 }}>
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase', mb: 1.2 }}>
              Información general
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 1.6 }}>
                <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
                <TextField label="Código" value={code} onChange={(event) => setCode(event.target.value)} />
              </Box>
              <TextField label="Descripción" multiline minRows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.6 }}>
                <TextField select label="Estado" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
                  {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((value) => (
                    <MenuItem key={value} value={value}>
                      {PROJECT_STATUS[value].label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Inicio del proyecto"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField label="Zona horaria" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#475569', mb: 0.8 }}>Color</Typography>
                <Box sx={{ display: 'flex', gap: 0.9 }}>
                  {COLORS.map((item) => (
                    <Box
                      key={item}
                      component="button"
                      type="button"
                      onClick={() => setColor(item)}
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: item,
                        cursor: 'pointer',
                        boxShadow: color === item ? '0 0 0 2px #fff, 0 0 0 4px #4F46E5' : 'none',
                      }}
                      aria-label={`Color ${item}`}
                    />
                  ))}
                </Box>
              </Box>
              <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>
                Fin calculado del proyecto: <b>{formatLongDate(project.computedEnd)}</b>. Se actualiza con la última actividad.
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase', mb: 1.2 }}>
              Calendario de trabajo
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1.1 }}>
              Las duraciones y dependencias respetan estos días.
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {DAYS.map((day) => {
                const active = workingDays.includes(day.value);
                return (
                  <Box
                    key={day.value}
                    component="button"
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    title={day.name}
                    sx={{
                      width: 40,
                      height: 34,
                      borderRadius: 2,
                      border: active ? '1px solid #A5B4FC' : '1px solid #E2E8F0',
                      backgroundColor: active ? '#EEF2FF' : '#fff',
                      color: active ? '#3730A3' : '#94A3B8',
                      fontWeight: 750,
                      fontSize: 11.5,
                      cursor: 'pointer',
                    }}
                  >
                    {day.label}
                  </Box>
                );
              })}
              <Typography sx={{ alignSelf: 'center', fontSize: 10.5, color: '#94A3B8', ml: 0.8 }}>
                {workingDays.length} de 7 días
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#475569', mb: 0.8 }}>
                Días festivos / no laborables
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  label="Agregar fecha"
                  type="date"
                  value={holidayDraft}
                  onChange={(event) => setHolidayDraft(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 190 }}
                />
                <Button variant="outlined" onClick={addHoliday} disabled={!holidayDraft} startIcon={<AddRoundedIcon />}>
                  Agregar
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', mt: holidays.length ? 1.2 : 0 }}>
                {holidays.map((holiday) => (
                  <Chip
                    key={holiday}
                    label={formatLongDate(holiday)}
                    size="small"
                    onDelete={() => setHolidays((current) => current.filter((item) => item !== holiday))}
                    deleteIcon={<CloseRoundedIcon />}
                    sx={{ backgroundColor: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA' }}
                  />
                ))}
                {holidays.length === 0 && (
                  <Typography sx={{ fontSize: 10.5, color: '#A3B0C2' }}>Sin festivos configurados.</Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase', mb: 1.2 }}>
              Programación y línea de tiempo
            </Typography>
            <RadioGroup
              value={schedulingMode}
              onChange={(event) => setSchedulingMode(event.target.value as SchedulingMode)}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}
            >
              {[
                {
                  value: 'manual',
                  title: 'Manual',
                  description: 'Tú decides las fechas. Las dependencias se muestran, pero no mueven actividades.',
                },
                {
                  value: 'automatic',
                  title: 'Automático',
                  description: 'Al mover una actividad, sus sucesoras se reprograman respetando el calendario.',
                },
              ].map((option) => (
                <Box
                  key={option.value}
                  onClick={() => setSchedulingMode(option.value as SchedulingMode)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: schedulingMode === option.value ? '1.5px solid #818CF8' : '1px solid #E2E8F0',
                    backgroundColor: schedulingMode === option.value ? '#F8FAFF' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <FormControlLabel
                    value={option.value}
                    control={<Radio size="small" />}
                    label={<Typography sx={{ fontSize: 12, fontWeight: 650 }}>{option.title}</Typography>}
                    sx={{ m: 0, pointerEvents: 'none' }}
                  />
                  <Typography sx={{ fontSize: 10.5, color: '#64748B', lineHeight: 1.5, mt: 0.3 }}>
                    {option.description}
                  </Typography>
                </Box>
              ))}
            </RadioGroup>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.6, mt: 2 }}>
              <Box>
                <FormControlLabel
                  control={<Switch size="small" checked={showToday} onChange={(event) => setShowToday(event.target.checked)} />}
                  label={<Typography sx={{ fontSize: 12 }}>Mostrar línea de hoy</Typography>}
                />
                <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>
                  Se dibuja en naranja sobre el diagrama.
                </Typography>
              </Box>
              <TextField
                label="Fecha de referencia (opcional)"
                type="date"
                value={referenceDate}
                onChange={(event) => setReferenceDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Si se define, reemplaza la línea de hoy. Déjalo vacío para usar la fecha real."
              />
              <TextField
                select
                label="Vista inicial"
                value={defaultScale}
                onChange={(event) => setDefaultScale(event.target.value as GanttScale)}
                helperText="Escala que se muestra al abrir el cronograma."
              >
                <MenuItem value="day">Diaria</MenuItem>
                <MenuItem value="week">Semanal</MenuItem>
                <MenuItem value="month">Mensual</MenuItem>
              </TextField>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} color="inherit" /> : 'Guardar configuración'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
