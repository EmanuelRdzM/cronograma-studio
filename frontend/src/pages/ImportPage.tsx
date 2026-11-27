import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import { api, ApiError } from '@/api/client';
import type { PlantUmlPreview, ProjectBundle } from '@/api/types';
import { formatShortDate } from '@/lib/dates';
import { useToast } from '@/components/ToastProvider';

const EXAMPLE = `@startgantt
title Mi proyecto
Project starts 2026-10-05
projectscale weekly
saturday are closed
sunday are closed

-- Fase 1 - Planeación --
[Diseño de la solución] starts 2026-10-05
[Diseño de la solución] lasts 5 days
[Diseño de la solución] is 50% completed

-- Fase 2 - Ejecución --
[Desarrollo] starts at [Diseño de la solución]'s end
[Desarrollo] lasts 10 days
[Desarrollo] is colored in #FF0000

today is 2026-10-20 and is colored in orange
@endgantt`;

export function ImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PlantUmlPreview | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const previewMutation = useMutation({
    mutationFn: () =>
      api<{ preview: PlantUmlPreview }>('/projects/import/plantuml', {
        method: 'POST',
        body: { text },
      }),
    onSuccess: (result) => {
      setPreview(result.preview);
      setName(result.preview.title);
      setError('');
      setShowAll(false);
      if (result.preview.errors.length === 0) {
        toast.success('Código analizado. Revisa la previsualización.');
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'No se pudo analizar el código');
      setPreview(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: () =>
      api<ProjectBundle>('/projects/import/plantuml/confirm', {
        method: 'POST',
        body: { text, name: name.trim() || undefined },
      }),
    onSuccess: (bundle) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Cronograma importado');
      navigate(`/projects/${bundle.project.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo importar'),
  });

  const loadFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 500_000) {
      setError('El archivo supera el límite de 500 KB.');
      return;
    }
    const content = await file.text();
    setText(content);
    setFileName(file.name);
    setPreview(null);
    setError('');
  };

  const activitiesToShow = preview
    ? showAll
      ? preview.activities
      : preview.activities.slice(0, 10)
    : [];

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <Box sx={{ maxWidth: 1380, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2, md: 3.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, mb: 2.5 }}>
          <IconButton size="small" onClick={() => navigate('/')} sx={{ mt: 0.4, color: '#64748B' }} aria-label="Volver">
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.15em', color: '#4F46E5', textTransform: 'uppercase' }}>
              Compatibilidad con tu flujo anterior
            </Typography>
            <Typography variant="h1" sx={{ mt: 0.6, fontSize: { xs: 25, md: 30 } }}>
              Importar PlantUML
            </Typography>
            <Typography sx={{ mt: 0.7, color: '#64748B', fontSize: 13, maxWidth: 620 }}>
              Pega tu código o sube el archivo. Convertiremos las fases, actividades, fechas, avances, colores y
              dependencias en un proyecto editable.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.08fr 1fr' }, gap: 2, alignItems: 'start' }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <Box sx={{ px: 2.2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #EEF2F7' }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: 'grid', placeItems: 'center', backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                <CodeRoundedIcon sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 680, color: '#334155' }}>Código PlantUML</Typography>
                <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>
                  {fileName || 'Pega el contenido o carga un archivo .puml / .txt'}
                </Typography>
              </Box>
              <input
                ref={fileInput}
                type="file"
                accept=".puml,.plantuml,.txt,text/plain"
                hidden
                onChange={(event) => void loadFile(event.target.files?.[0])}
              />
              <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => fileInput.current?.click()}>
                Subir archivo
              </Button>
            </Box>
            <TextField
              multiline
              fullWidth
              minRows={22}
              maxRows={32}
              placeholder={`@startgantt\n...\n@endgantt`}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (preview) setPreview(null);
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 0,
                  fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
                  fontSize: 11.5,
                  lineHeight: 1.6,
                  backgroundColor: '#FCFDFE',
                  alignItems: 'flex-start',
                  '& fieldset': { border: 'none' },
                },
                '& textarea': { color: '#334155' },
              }}
            />
            <Box sx={{ px: 2, py: 1.2, borderTop: '1px solid #EEF2F7', display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#FBFCFE' }}>
              <Typography sx={{ fontSize: 10, color: '#94A3B8', flex: 1 }}>
                {text.length.toLocaleString('es-MX')} caracteres
              </Typography>
              <Button
                size="small"
                color="inherit"
                startIcon={<DeleteOutlineRoundedIcon />}
                disabled={!text || previewMutation.isPending}
                onClick={() => {
                  setText('');
                  setFileName('');
                  setPreview(null);
                  setError('');
                }}
              >
                Limpiar
              </Button>
              <Button
                variant="contained"
                startIcon={previewMutation.isPending ? <CircularProgress size={15} color="inherit" /> : <PlayArrowRoundedIcon />}
                disabled={!text.trim() || previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
              >
                Analizar código
              </Button>
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {!preview ? (
              <>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                    Esto se convertirá en datos editables
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.6, lineHeight: 1.6 }}>
                    No se guarda como texto: cada actividad, fase y dependencia se administra por separado en la base de datos.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.1, mt: 2 }}>
                    {[
                      { label: 'Título y fecha de inicio', desc: 'title + Project starts' },
                      { label: 'Fases y secciones', desc: '-- Fase --' },
                      { label: 'Actividades y duración', desc: '[Tarea] lasts N days' },
                      { label: 'Dependencias fin → inicio', desc: "starts at [Otra]'s end" },
                      { label: 'Avance', desc: 'is N% completed' },
                      { label: 'Colores', desc: 'is colored in #RRGGBB' },
                      { label: 'Calendario', desc: 'saturday / sunday are closed' },
                      { label: 'Referencia de fecha', desc: 'today is ...' },
                    ].map((item) => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 14, color: '#10B981', mt: 0.2 }} />
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 650, color: '#334155' }}>{item.label}</Typography>
                          <Typography sx={{ fontSize: 9, color: '#94A3B8', fontFamily: 'monospace' }}>{item.desc}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #E2E8F0', backgroundColor: '#FBFCFE' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <HelpOutlineRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 680, color: '#334155' }}>Ejemplo de sintaxis compatible</Typography>
                    <IconButton size="small" onClick={() => setShowHelp((value) => !value)} sx={{ ml: 'auto', color: '#64748B' }}>
                      <ExpandMoreRoundedIcon sx={{ fontSize: 18, transform: showHelp ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
                    </IconButton>
                  </Box>
                  <Collapse in={showHelp}>
                    <Box
                      component="pre"
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: '#0F172A',
                        color: '#E2E8F0',
                        fontSize: 10,
                        lineHeight: 1.6,
                        overflow: 'auto',
                        maxHeight: 300,
                        fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
                      }}
                    >
                      {EXAMPLE}
                    </Box>
                  </Collapse>
                  {!showHelp && (
                    <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mt: 0.7 }}>
                      Ábrelo para ver un fragmento con las construcciones soportadas.
                    </Typography>
                  )}
                </Paper>
              </>
            ) : (
              <>
                {preview.errors.length > 0 ? (
                  <Alert severity="error" icon={<ErrorOutlineRoundedIcon />}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 650 }}>No se puede importar todavía</Typography>
                    {preview.errors.map((item, index) => (
                      <Typography key={index} sx={{ fontSize: 11, mt: 0.5 }}>
                        {item.line ? `Línea ${item.line}: ` : ''}
                        {item.message}
                      </Typography>
                    ))}
                  </Alert>
                ) : (
                  <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ fontSize: 11.5 }}>
                    Código analizado correctamente. Revisa el resultado y guarda el proyecto.
                  </Alert>
                )}

                <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase', mb: 1 }}>
                    Resumen
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.8 }}>
                    {[
                      { icon: <LayersRoundedIcon sx={{ fontSize: 15 }} />, value: preview.summary.phases, label: 'Fases' },
                      { icon: <TaskAltRoundedIcon sx={{ fontSize: 15 }} />, value: preview.summary.activities, label: 'Actividades' },
                      { icon: <AccountTreeRoundedIcon sx={{ fontSize: 15 }} />, value: preview.summary.dependencies, label: 'Dependencias' },
                      { icon: <WarningAmberRoundedIcon sx={{ fontSize: 15 }} />, value: preview.summary.warnings, label: 'Avisos' },
                    ].map((stat) => (
                      <Box key={stat.label} sx={{ p: 1, borderRadius: 2, backgroundColor: '#F8FAFC', textAlign: 'center' }}>
                        <Box sx={{ color: '#64748B', display: 'flex', justifyContent: 'center' }}>{stat.icon}</Box>
                        <Typography sx={{ fontSize: 17, fontWeight: 750, color: '#0F172A', lineHeight: 1.4 }}>{stat.value}</Typography>
                        <Typography sx={{ fontSize: 8.5, color: '#94A3B8' }}>{stat.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 1.6 }}>
                    <TextField label="Inicio" value={formatShortDate(preview.projectStart)} size="small" InputProps={{ readOnly: true }} />
                    <TextField label="Calendario" value={`${preview.workingDays.length} días laborables`} size="small" InputProps={{ readOnly: true }} />
                  </Box>
                  <TextField
                    label="Nombre del nuevo proyecto"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    fullWidth
                    sx={{ mt: 1.4 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 1.6 }}
                    disabled={preview.errors.length > 0 || importMutation.isPending || !name.trim()}
                    startIcon={importMutation.isPending ? <CircularProgress size={15} color="inherit" /> : <CheckCircleRoundedIcon />}
                    onClick={() => importMutation.mutate()}
                  >
                    Guardar como proyecto
                  </Button>
                </Paper>

                {preview.warnings.length > 0 && (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #FDE68A', backgroundColor: '#FFFDF5' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.9 }}>
                      <WarningAmberRoundedIcon sx={{ fontSize: 16, color: '#B45309' }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 680, color: '#92400E' }}>
                        Avisos de importación ({preview.warnings.length})
                      </Typography>
                    </Box>
                    <Box sx={{ maxHeight: 150, overflow: 'auto', pr: 0.5 }}>
                      {preview.warnings.map((item, index) => (
                        <Typography key={index} sx={{ fontSize: 10.5, color: '#92400E', lineHeight: 1.55 }}>
                          {item.line ? `Línea ${item.line}: ` : ''}
                          {item.message}
                        </Typography>
                      ))}
                    </Box>
                  </Paper>
                )}

                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #EEF2F7' }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 680, color: '#334155' }}>
                      Actividades ({preview.activities.length})
                    </Typography>
                    <Chip label={preview.defaultScale === 'day' ? 'Vista diaria' : preview.defaultScale === 'week' ? 'Vista semanal' : 'Vista mensual'} size="small" sx={{ height: 19, fontSize: 8.5 }} />
                  </Box>
                  <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontSize: 9, fontWeight: 750, color: '#94A3B8' }}>Actividad</TableCell>
                          <TableCell sx={{ fontSize: 9, fontWeight: 750, color: '#94A3B8' }}>Inicio</TableCell>
                          <TableCell sx={{ fontSize: 9, fontWeight: 750, color: '#94A3B8' }}>Fin</TableCell>
                          <TableCell sx={{ fontSize: 9, fontWeight: 750, color: '#94A3B8' }} align="right">Días</TableCell>
                          <TableCell sx={{ fontSize: 9, fontWeight: 750, color: '#94A3B8' }} align="right">Avance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activitiesToShow.map((activity, index) => (
                          <TableRow key={`${activity.name}-${index}`}>
                            <TableCell sx={{ fontSize: 10.5, color: '#334155', maxWidth: 220 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                {activity.color && (
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: activity.color, flexShrink: 0 }} />
                                )}
                                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.name}</Box>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: 9.5, color: '#64748B', whiteSpace: 'nowrap' }}>{formatShortDate(activity.startDate)}</TableCell>
                            <TableCell sx={{ fontSize: 9.5, color: '#64748B', whiteSpace: 'nowrap' }}>{formatShortDate(activity.endDate)}</TableCell>
                            <TableCell sx={{ fontSize: 9.5, color: '#64748B' }} align="right">{activity.duration}</TableCell>
                            <TableCell sx={{ fontSize: 9.5, fontWeight: 650, color: activity.progress === 100 ? '#047857' : '#64748B' }} align="right">
                              {activity.progress}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                  {preview.activities.length > 10 && (
                    <Box sx={{ p: 1, borderTop: '1px solid #EEF2F7', display: 'flex', justifyContent: 'center' }}>
                      <Button size="small" onClick={() => setShowAll((value) => !value)}>
                        {showAll ? 'Mostrar menos' : `Ver las ${preview.activities.length} actividades`}
                      </Button>
                    </Box>
                  )}
                </Paper>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
