import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { api, ApiError } from '@/api/client';
import type { PublicShareData } from '@/api/types';
import { PROJECT_STATUS } from '@/lib/labels';
import { formatDateRange, formatDateTime } from '@/lib/dates';
import { Logo, LogoMark } from '@/components/Logo';
import { GanttView } from '@/features/gantt/GanttView';
import { ExportDialog } from '@/features/gantt/ExportDialog';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F5F7FB' }}>
      <Box
        component="header"
        sx={{
          height: 58,
          px: { xs: 2, md: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          flexShrink: 0,
        }}
      >
        <Link to="/" aria-label="Cronograma Studio" style={{ display: 'flex', minWidth: 0 }}>
          <Logo />
        </Link>
        <Chip
          icon={<VisibilityRoundedIcon sx={{ fontSize: 13 }} />}
          label="Solo lectura"
          size="small"
          title="Vista compartida de solo lectura"
          sx={{
            ml: 'auto',
            height: 24,
            fontSize: 9.5,
            flexShrink: 0,
            backgroundColor: '#F0F9FF',
            color: '#0369A1',
            '& .MuiChip-icon': { color: '#0369A1' },
          }}
        />
      </Box>
      {children}
    </Box>
  );
}

function ErrorPanel({
  title,
  description,
  code,
}: {
  title: string;
  description: string;
  code?: string;
}) {
  return (
    <Shell>
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', px: 3 }}>
        <Paper elevation={0} sx={{ maxWidth: 420, p: 4, borderRadius: 3.5, border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <Box sx={{ width: 54, height: 54, borderRadius: 3, display: 'grid', placeItems: 'center', backgroundColor: '#F1F5F9', color: '#64748B', mx: 'auto', mb: 2 }}>
            <LinkOffRoundedIcon sx={{ fontSize: 26 }} />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 730, color: '#0F172A' }}>{title}</Typography>
          <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.8, lineHeight: 1.6 }}>{description}</Typography>
          {code && <Typography sx={{ fontSize: 9.5, color: '#B0BBC9', mt: 1.5, fontFamily: 'monospace' }}>{code}</Typography>}
          <Button component={Link} to="/" variant="outlined" sx={{ mt: 2.5 }} startIcon={<ArrowBackRoundedIcon />}>
            Ir a Cronograma Studio
          </Button>
        </Paper>
      </Box>
    </Shell>
  );
}

export function PublicSharePage() {
  const { token = '' } = useParams();
  const [passwordInput, setPasswordInput] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const query = useQuery({
    queryKey: ['public-share', token, submittedPassword],
    queryFn: () =>
      api<PublicShareData>(`/shared/${token}`, {
        token: null,
        headers: submittedPassword ? { 'x-share-password': submittedPassword } : undefined,
      }),
    enabled: Boolean(token),
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!query.error) return;
    const error = query.error;
    if (error instanceof ApiError && error.code === 'SHARE_PASSWORD_INVALID') {
      setPasswordError('Contraseña incorrecta. Inténtalo de nuevo.');
      setSubmittedPassword('');
    }
  }, [query.error]);

  const fileError = query.error instanceof ApiError ? query.error : null;

  if (fileError && ['SHARE_NOT_FOUND', 'SHARE_EXPIRED'].includes(fileError.code || '')) {
    return (
      <ErrorPanel
        title={fileError.code === 'SHARE_EXPIRED' ? 'Este enlace expiró' : 'Este enlace ya no está disponible'}
        description={
          fileError.code === 'SHARE_EXPIRED'
            ? 'Pide a la persona que compartió el cronograma un enlace nuevo.'
            : 'El enlace fue revocado o no existe. Solicita uno nuevo a quien lo compartió.'
        }
        code={fileError.code}
      />
    );
  }

  if (fileError?.code === 'SHARE_PASSWORD_REQUIRED' || (fileError?.code === 'SHARE_PASSWORD_INVALID' && !query.isFetching)) {
    return (
      <Shell>
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', px: 3 }}>
          <Paper elevation={0} sx={{ width: '100%', maxWidth: 390, p: 4, borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'grid', placeItems: 'center', backgroundColor: '#EEF2FF', color: '#4F46E5', mb: 2 }}>
              <LockRoundedIcon sx={{ fontSize: 23 }} />
            </Box>
            <Typography sx={{ fontSize: 19, fontWeight: 740, color: '#0F172A' }}>Cronograma protegido</Typography>
            <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.7, lineHeight: 1.6 }}>
              Quien compartió este enlace configuró una contraseña. Escríbela para consultar el cronograma.
            </Typography>
            {passwordError && (
              <Alert severity="error" sx={{ mt: 2, fontSize: 11.5 }}>
                {passwordError}
              </Alert>
            )}
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!passwordInput.trim()) return;
                setPasswordError('');
                setSubmittedPassword(passwordInput);
              }}
              sx={{ mt: 2.2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              <TextField
                label="Contraseña del enlace"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                autoFocus
              />
              <Button type="submit" variant="contained" disabled={!passwordInput.trim() || query.isFetching}>
                {query.isFetching ? <CircularProgress size={16} color="inherit" /> : 'Ver cronograma'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Shell>
    );
  }

  if (query.isLoading) {
    return (
      <Shell>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, width: '100%', mx: 'auto' }}>
          <Skeleton variant="rounded" height={80} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height="calc(100vh - 190px)" />
        </Box>
      </Shell>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorPanel
        title="No se pudo abrir el cronograma"
        description={fileError?.message || 'Ocurrió un error al cargar la información compartida.'}
      />
    );
  }

  const data = query.data;
  const project = data.project;
  const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.planning;

  return (
    <Shell>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', maxWidth: 1800, width: '100%', mx: 'auto', px: { xs: 1.5, md: 2.5 }, py: { xs: 1.5, md: 2.2 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.4 },
            borderRadius: 3,
            border: '1px solid #E2E8F0',
            mb: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ width: 44, height: 44, borderRadius: 2.2, backgroundColor: `${project.color}14`, border: `1px solid ${project.color}22`, color: project.color, display: { xs: 'none', sm: 'grid' }, placeItems: 'center' }}>
            <LogoMark size={24} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 230 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
              <Typography component="h1" sx={{ fontSize: { xs: 19, md: 23 }, fontWeight: 760, letterSpacing: '-0.03em', color: '#0F172A' }}>
                {project.name}
              </Typography>
              <Chip label={status.label} size="small" sx={{ height: 20, fontSize: 9.5, backgroundColor: status.bg, color: status.color }} />
              {project.code && (
                <Chip label={project.code} size="small" sx={{ height: 20, fontSize: 9, fontFamily: 'monospace', backgroundColor: '#F1F5F9', color: '#64748B' }} />
              )}
            </Box>
            {project.description && (
              <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.35, maxWidth: 760, display: { xs: 'none', sm: 'block' } }}>{project.description}</Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, mt: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45 }}>
                <CalendarTodayRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>{formatDateRange(project.computedStart, project.computedEnd)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45 }}>
                <ChecklistRoundedIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>
                  {project.activityCount} actividades · {project.phaseCount} fases
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}>
                <LinearProgress
                  variant="determinate"
                  value={project.progress}
                  sx={{ width: 70, height: 4, backgroundColor: '#EEF2F7', '& .MuiLinearProgress-bar': { backgroundColor: project.color } }}
                />
                <Typography sx={{ fontSize: 10, fontWeight: 750, color: '#475569' }}>{project.progress}%</Typography>
              </Box>
              <Typography sx={{ fontSize: 9.5, color: '#B0BBC9', display: { xs: 'none', sm: 'block' } }}>
                Actualizado {formatDateTime(project.updatedAt)}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Tooltip title={query.isFetching ? 'Actualizando…' : 'Actualizar datos'}>
              <span>
                <IconButton size="small" onClick={() => query.refetch()} disabled={query.isFetching} sx={{ color: '#64748B' }}>
                  {query.isFetching ? <CircularProgress size={16} /> : <RefreshRoundedIcon sx={{ fontSize: 19 }} />}
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              size="small"
              aria-label="Exportar"
              startIcon={<DownloadRoundedIcon />}
              onClick={() => setExportOpen(true)}
              sx={{
                minWidth: { xs: 38, sm: 'auto' },
                px: { xs: 1.1, sm: 2 },
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Exportar</Box>
            </Button>
          </Box>
        </Paper>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <GanttView
            project={project}
            phases={data.phases}
            activities={data.activities}
            dependencies={data.dependencies}
            readOnly
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 9.5, color: '#A3B0C2' }}>
            Este enlace es de solo lectura. Los cambios del propietario aparecen al recargar o cada 30 segundos.
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: '#A3B0C2' }}>
            {data.shared.expiresAt ? `Enlace válido hasta ${formatDateTime(data.shared.expiresAt)}` : 'Enlace sin fecha de expiración'}
          </Typography>
        </Box>
      </Box>

      <ExportDialog
        open={exportOpen}
        project={project}
        phases={data.phases}
        activities={data.activities}
        dependencies={data.dependencies}
        initialScale={project.defaultScale}
        publicMode
        onClose={() => setExportOpen(false)}
      />
    </Shell>
  );
}
