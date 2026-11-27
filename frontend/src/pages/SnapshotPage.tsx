import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { api, ApiError } from '@/api/client';
import type { SnapshotDetail } from '@/api/types';
import { formatDateTime, formatDateRange } from '@/lib/dates';
import { GanttView } from '@/features/gantt/GanttView';
import { ExportDialog } from '@/features/gantt/ExportDialog';

export function SnapshotPage() {
  const { projectId = '', snapshotId = '' } = useParams();
  const navigate = useNavigate();
  const [exportOpen, setExportOpen] = useState(false);

  const query = useQuery({
    queryKey: ['snapshot', projectId, snapshotId],
    queryFn: () => api<{ snapshot: SnapshotDetail }>(`/projects/${projectId}/snapshots/${snapshotId}`),
    enabled: Boolean(projectId && snapshotId),
  });

  if (query.isLoading) {
    return (
      <Box sx={{ flex: 1, p: 3 }}>
        <Skeleton variant="rounded" height={70} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height="calc(100vh - 190px)" />
      </Box>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
        <Alert severity="error">
          {query.error instanceof ApiError ? query.error.message : 'No se pudo cargar la versión'}
          <Box sx={{ mt: 1 }}>
            <Button size="small" onClick={() => navigate(`/projects/${projectId}`)}>
              Volver al proyecto
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  const { snapshot } = query.data;
  const { project, phases, activities, dependencies } = snapshot.data;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#F5F7FB' }}>
      <Box
        sx={{
          flexShrink: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          px: { xs: 1.6, md: 2.6 },
          py: 1.3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.4,
          flexWrap: 'wrap',
        }}
      >
        <IconButton size="small" onClick={() => navigate(`/projects/${projectId}`)} sx={{ color: '#64748B' }} aria-label="Volver al proyecto">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#ECFEFF', color: '#0E7490' }}>
          <HistoryRoundedIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: { xs: 15, md: 18 }, fontWeight: 750, letterSpacing: '-0.025em', color: '#0F172A' }}>
              {snapshot.name}
            </Typography>
            <Chip label="Versión guardada" size="small" sx={{ height: 20, fontSize: 9.5, backgroundColor: '#ECFEFF', color: '#0E7490' }} />
            <Chip label="Solo lectura" size="small" variant="outlined" sx={{ height: 20, fontSize: 9.5, borderColor: '#E2E8F0', color: '#64748B' }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mt: 0.35, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>{project.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: 10, color: '#64748B' }}>
                {formatDateRange(project.computedStart, project.computedEnd)}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 10, color: '#94A3B8' }}>Guardada {formatDateTime(snapshot.createdAt)}</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>{project.progress}% de avance</Typography>
          </Box>
        </Box>
        <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon />} onClick={() => setExportOpen(true)}>
          Exportar
        </Button>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, p: { xs: 1, md: 1.6 }, display: 'flex' }}>
        <GanttView
          project={project}
          phases={phases}
          activities={activities}
          dependencies={dependencies}
          readOnly
          initialScale={project.defaultScale}
        />
      </Box>
      <ExportDialog
        open={exportOpen}
        project={project}
        phases={phases}
        activities={activities}
        dependencies={dependencies}
        initialScale={project.defaultScale}
        publicMode
        onClose={() => setExportOpen(false)}
      />
    </Box>
  );
}
