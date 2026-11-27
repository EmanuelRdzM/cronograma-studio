import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import type { Activity, Dependency, GanttScale, Phase, Project } from '@/api/types';
import { apiDownload } from '@/api/client';
import { buildExportSvg } from './exportSvg';
import { formatShortDate } from '@/lib/dates';
import { useToast } from '@/components/ToastProvider';

type ExportFormat = 'png' | 'svg' | 'pdf' | 'xlsx' | 'csv' | 'json' | 'plantuml';

const FORMATS: { value: ExportFormat; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'png', label: 'PNG', hint: 'Imagen nítida', icon: <ImageRoundedIcon fontSize="small" /> },
  { value: 'svg', label: 'SVG', hint: 'Vector editable', icon: <CodeRoundedIcon fontSize="small" /> },
  { value: 'pdf', label: 'PDF', hint: 'Para imprimir', icon: <PictureAsPdfRoundedIcon fontSize="small" /> },
  { value: 'xlsx', label: 'Excel', hint: 'Tabla de datos', icon: <TableChartRoundedIcon fontSize="small" /> },
  { value: 'csv', label: 'CSV', hint: 'Intercambio', icon: <DescriptionRoundedIcon fontSize="small" /> },
  { value: 'json', label: 'JSON', hint: 'Respaldo completo', icon: <DataObjectRoundedIcon fontSize="small" /> },
  { value: 'plantuml', label: 'PlantUML', hint: 'Código compatible', icon: <AccountTreeRoundedIcon fontSize="small" /> },
];

interface ExportDialogProps {
  open: boolean;
  project: Project;
  phases: Phase[];
  activities: Activity[];
  dependencies: Dependency[];
  initialScale?: GanttScale;
  publicMode?: boolean;
  onClose: () => void;
}

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'cronograma';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function svgToCanvas(
  svg: string,
  width: number,
  height: number,
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  await document.fonts.ready;
  const targetScale = Math.min(2, 14_000 / width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * targetScale));
  canvas.height = Math.max(1, Math.round(height * targetScale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar el lienzo');
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo renderizar la imagen'));
      image.src = url;
    });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('No se pudo convertir la imagen'))),
      'image/png',
    );
  });
  return { dataUrl: canvas.toDataURL('image/png'), blob: pngBlob, width: canvas.width, height: canvas.height };
}

function rowsForTable(project: Project, phases: Phase[], activities: Activity[], dependencies: Dependency[]) {
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const orderedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const phaseOrder = new Map(orderedPhases.map((phase, index) => [phase.id, index]));
  const sorted = [...activities].sort((a, b) => {
    const phaseA = a.phaseId ? phaseOrder.get(a.phaseId) ?? 999 : 999;
    const phaseB = b.phaseId ? phaseOrder.get(b.phaseId) ?? 999 : 999;
    return phaseA - phaseB || a.sortOrder - b.sortOrder;
  });
  return sorted.map((activity) => {
    const predecessors = dependencies
      .filter((dependency) => dependency.successorId === activity.id)
      .map((dependency) => activityById.get(dependency.predecessorId)?.name ?? '')
      .filter(Boolean)
      .join(', ');
    return {
      Proyecto: project.name,
      Fase: activity.phaseId ? phaseById.get(activity.phaseId)?.name ?? 'Sin fase' : 'Sin fase',
      Actividad: activity.name,
      Tipo: activity.type === 'milestone' ? 'Hito' : activity.type === 'summary' ? 'Resumen' : 'Tarea',
      Inicio: activity.startDate,
      Fin: activity.endDate,
      'Duración (días)': activity.duration,
      'Tipo de días': activity.durationUnit === 'calendar_day' ? 'Naturales' : 'Laborables',
      'Avance (%)': activity.progress,
      Estado: activity.status,
      Prioridad: activity.priority,
      Responsable: activity.assignee ?? '',
      Predecesoras: predecessors,
      Color: activity.color ?? '',
      Notas: activity.notes ?? '',
    };
  });
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\r\n');
}

export function ExportDialog({
  open,
  project,
  phases,
  activities,
  dependencies,
  initialScale,
  publicMode = false,
  onClose,
}: ExportDialogProps) {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<GanttScale>(initialScale ?? project.defaultScale ?? 'week');
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const formats = publicMode ? FORMATS.filter((item) => !['json', 'plantuml'].includes(item.value)) : FORMATS;

  const exportNow = async () => {
    setError('');
    setBusy(true);
    const base = safeFilename(project.name);
    try {
      if (format === 'json') {
        await apiDownload(`/projects/${project.id}/export/json`, `${base}.json`);
      } else if (format === 'plantuml') {
        await apiDownload(`/projects/${project.id}/export/plantuml`, `${base}.puml`);
      } else if (format === 'xlsx' || format === 'csv') {
        const rows = rowsForTable(project, phases, activities, dependencies);
        if (format === 'csv') {
          downloadBlob(new Blob([`\uFEFF${buildCsv(rows)}`], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
        } else {
          const excelModule = await import('exceljs');
          const ExcelJS = (excelModule as unknown as { default?: typeof excelModule }).default ?? excelModule;
          const workbook = new ExcelJS.Workbook();
          const activitySheet = workbook.addWorksheet('Actividades');
          const headers = Object.keys(rows[0] ?? {});
          activitySheet.columns = headers.map((header) => ({
            header,
            key: header,
            width: Math.min(42, Math.max(12, header.length + 4)),
          }));
          activitySheet.getRow(1).font = { bold: true };
          activitySheet.views = [{ state: 'frozen', ySplit: 1 }];
          for (const row of rows) activitySheet.addRow(row);
          const dependencyRows = dependencies.map((dependency) => ({
            Predecesora: activities.find((activity) => activity.id === dependency.predecessorId)?.name ?? '',
            Sucesora: activities.find((activity) => activity.id === dependency.successorId)?.name ?? '',
            Tipo: dependency.type,
            'Retraso (días)': dependency.lag,
          }));
          if (dependencyRows.length) {
            const dependencySheet = workbook.addWorksheet('Dependencias');
            dependencySheet.columns = [
              { header: 'Predecesora', key: 'Predecesora', width: 42 },
              { header: 'Sucesora', key: 'Sucesora', width: 42 },
              { header: 'Tipo', key: 'Tipo', width: 8 },
              { header: 'Retraso (días)', key: 'Retraso (días)', width: 14 },
            ];
            dependencySheet.getRow(1).font = { bold: true };
            for (const row of dependencyRows) dependencySheet.addRow(row);
          }
          const projectSheet = workbook.addWorksheet('Proyecto');
          projectSheet.columns = [
            { header: 'Campo', key: 'Campo', width: 26 },
            { header: 'Valor', key: 'Valor', width: 52 },
          ];
          projectSheet.getRow(1).font = { bold: true };
          for (const row of [
            { Campo: 'Proyecto', Valor: project.name },
            { Campo: 'Código', Valor: project.code ?? '' },
            { Campo: 'Estado', Valor: project.status },
            { Campo: 'Inicio', Valor: project.computedStart },
            { Campo: 'Fin', Valor: project.computedEnd },
            { Campo: 'Avance calculado (%)', Valor: project.progress },
            { Campo: 'Actividades', Valor: project.activityCount },
            { Campo: 'Días laborables', Valor: project.workingDays.join(',') },
            { Campo: 'Festivos', Valor: project.holidays.join(',') },
          ]) {
            projectSheet.addRow(row);
          }
          const buffer = await workbook.xlsx.writeBuffer();
          downloadBlob(
            new Blob([buffer as BlobPart], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            `${base}.xlsx`,
          );
        }
      } else {
        const { svg, width, height } = buildExportSvg(
          { project, phases, activities, dependencies },
          { scale, includeTitle, includeLegend },
        );
        if (format === 'svg') {
          downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${base}-${scale}.svg`);
        } else {
          const image = await svgToCanvas(svg, width, height);
          if (format === 'png') {
            downloadBlob(image.blob, `${base}-${scale}.png`);
          } else {
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 18;
            const ratio = Math.min(
              (pageWidth - margin * 2) / image.width,
              (pageHeight - margin * 2) / image.height,
            );
            const drawWidth = image.width * ratio;
            const drawHeight = image.height * ratio;
            pdf.addImage(
              image.dataUrl,
              'PNG',
              (pageWidth - drawWidth) / 2,
              (pageHeight - drawHeight) / 2,
              drawWidth,
              drawHeight,
              undefined,
              'FAST',
            );
            pdf.save(`${base}-${scale}.pdf`);
          }
        }
      }
      toast.success('Archivo generado');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el archivo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Exportar cronograma</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography sx={{ fontSize: 11.5, color: '#64748B', mb: 1.6 }}>
          Se exportan todas las fases y actividades (también las que están contraídas en pantalla).
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase', mb: 1 }}>
          Formato
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1 }}>
          {formats.map((item) => {
            const active = format === item.value;
            return (
              <ButtonBase
                key={item.value}
                onClick={() => setFormat(item.value)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 0.3,
                  p: 1.3,
                  borderRadius: 2,
                  border: active ? '1.5px solid #818CF8' : '1px solid #E2E8F0',
                  backgroundColor: active ? '#F8FAFF' : '#fff',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                  '&:hover': { borderColor: '#C7D2FE' },
                }}
              >
                <Box sx={{ color: active ? '#4F46E5' : '#64748B', mb: 0.3 }}>{item.icon}</Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: active ? '#3730A3' : '#334155' }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: 9, color: '#94A3B8' }}>{item.hint}</Typography>
              </ButtonBase>
            );
          })}
        </Box>

        {['png', 'svg', 'pdf'].includes(format) && (
          <Box sx={{ mt: 2.2, p: 1.6, borderRadius: 2, border: '1px solid #EEF2F7', backgroundColor: '#FBFCFE' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Escala visual"
                value={scale}
                onChange={(event) => setScale(event.target.value as GanttScale)}
                sx={{ width: 150, backgroundColor: '#fff' }}
              >
                <MenuItem value="day">Diaria</MenuItem>
                <MenuItem value="week">Semanal</MenuItem>
                <MenuItem value="month">Mensual</MenuItem>
              </TextField>
              <FormControlLabel
                control={<Checkbox size="small" checked={includeTitle} onChange={(event) => setIncludeTitle(event.target.checked)} />}
                label={<Typography sx={{ fontSize: 11.5 }}>Incluir título</Typography>}
              />
              <FormControlLabel
                control={<Checkbox size="small" checked={includeLegend} onChange={(event) => setIncludeLegend(event.target.checked)} />}
                label={<Typography sx={{ fontSize: 11.5 }}>Incluir leyenda</Typography>}
              />
            </Box>
            <Typography sx={{ fontSize: 10, color: '#A3B0C2', mt: 0.8 }}>
              La vista diaria genera archivos más anchos. Para PDF, la escala semanal o mensual suele leerse mejor.
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2.2, p: 1.4, borderRadius: 2, backgroundColor: '#F8FAFC', border: '1px solid #EEF2F7' }}>
          <Typography sx={{ fontSize: 10.5, color: '#64748B', lineHeight: 1.55 }}>
            <b>PDF / PNG:</b> incluyen título, tabla de actividades, calendario, dependencias y línea de hoy.
            <br />
            <b>Excel / CSV:</b> incluyen actividades, dependencias y metadatos del proyecto.
            <br />
            <b>PlantUML:</b> se genera desde el modelo actual con fechas, duración, colores y dependencias compatibles.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={exportNow}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={15} color="inherit" /> : <DownloadRoundedIcon />}
        >
          {busy ? 'Generando…' : 'Descargar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
