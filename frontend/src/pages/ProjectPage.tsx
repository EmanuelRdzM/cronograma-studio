import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import UpdateRoundedIcon from '@mui/icons-material/UpdateRounded';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import AutoModeRoundedIcon from '@mui/icons-material/AutoModeRounded';
import PanToolAltRoundedIcon from '@mui/icons-material/PanToolAltRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import { api, ApiError } from '@/api/client';
import type { Activity, Dependency, Phase, ProjectBundle } from '@/api/types';
import { PROJECT_STATUS } from '@/lib/labels';
import { formatDateRange } from '@/lib/dates';
import { GanttView } from '@/features/gantt/GanttView';
import { ActivityDrawer, type ActivityFormValues } from '@/features/gantt/ActivityDrawer';
import { PhaseDialog } from '@/features/gantt/PhaseDialog';
import { ProjectSettingsDialog, type ProjectSettingsValues } from '@/features/gantt/ProjectSettingsDialog';
import { ShareDialog } from '@/features/gantt/ShareDialog';
import { SnapshotsDialog } from '@/features/gantt/SnapshotsDialog';
import { ExportDialog } from '@/features/gantt/ExportDialog';
import { DependencyDialog } from '@/features/gantt/DependencyDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityDefaults, setActivityDefaults] = useState<{ phaseId?: string | null; parentId?: string | null }>({});
  const [drawerError, setDrawerError] = useState('');

  const [phaseDialog, setPhaseDialog] = useState<{ open: boolean; phase: Phase | null }>({ open: false, phase: null });
  const [phaseError, setPhaseError] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);
  const [deletePhase, setDeletePhase] = useState<Phase | null>(null);
  const [dependency, setDependency] = useState<Dependency | null>(null);
  const [dependencyError, setDependencyError] = useState('');

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api<ProjectBundle>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
  });

  const bundle = projectQuery.data;
  const project = bundle?.project;
  const phases = bundle?.phases ?? [];
  const activities = bundle?.activities ?? [];
  const dependencies = bundle?.dependencies ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const reportCascade = (changed: number) => {
    if (changed > 0) {
      toast.success(`Se reprogramaron ${changed} actividad${changed === 1 ? '' : 'es'} dependiente${changed === 1 ? '' : 's'}`);
    }
  };

  const createActivityMutation = useMutation({
    mutationFn: ({ values, predecessorIds }: { values: ActivityFormValues; predecessorIds: string[] }) =>
      api<{ activity: Activity; changed: number }>(`/projects/${projectId}/activities`, {
        method: 'POST',
        body: {
          name: values.name,
          description: values.description || null,
          phaseId: values.phaseId || null,
          parentId: values.parentId || null,
          type: values.type,
          startDate: values.startDate,
          endDate: values.endDate,
          duration: values.duration,
          durationUnit: values.durationUnit,
          progress: values.progress,
          status: values.status,
          priority: values.priority,
          color: values.color,
          assignee: values.assignee || null,
          notes: values.notes || null,
          predecessorIds,
        },
      }),
    onSuccess: (result) => {
      invalidate();
      setDrawerOpen(false);
      setEditingActivity(null);
      setDrawerError('');
      toast.success('Actividad creada');
      reportCascade(result.changed);
    },
    onError: (error) => setDrawerError(error instanceof ApiError ? error.message : 'No se pudo crear la actividad'),
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
      silent?: boolean;
    }) =>
      api<{ activity: Activity; changed: number }>(`/activities/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: (result, variables) => {
      invalidate();
      if (!variables.silent) {
        setDrawerOpen(false);
        setEditingActivity(null);
        setDrawerError('');
        toast.success('Actividad actualizada');
      }
      reportCascade(result.changed);
    },
    onError: (error, variables) => {
      if (variables.silent) toast.error(error instanceof ApiError ? error.message : 'No se pudieron guardar las fechas');
      else setDrawerError(error instanceof ApiError ? error.message : 'No se pudo guardar la actividad');
    },
  });

  const duplicateActivityMutation = useMutation({
    mutationFn: (activity: Activity) =>
      api<{ activity: Activity }>(`/activities/${activity.id}/duplicate`, { method: 'POST' }),
    onSuccess: () => {
      invalidate();
      toast.success('Actividad duplicada');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo duplicar'),
  });

  const moveActivityMutation = useMutation({
    mutationFn: async ({ activity, direction }: { activity: Activity; direction: 'up' | 'down' }) => {
      const siblings = activities
        .filter((item) => item.phaseId === activity.phaseId && item.parentId === activity.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));
      const index = siblings.findIndex((item) => item.id === activity.id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= siblings.length) return { changed: false };
      const reordered = [...siblings];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      await api(`/projects/${projectId}/activities/reorder`, {
        method: 'POST',
        body: { items: reordered.map((item, position) => ({ id: item.id, sortOrder: position })) },
      });
      return { changed: true };
    },
    onSuccess: (result) => {
      if (!result.changed) {
        toast.toast('La actividad ya está en el extremo de su grupo.', 'info');
        return;
      }
      invalidate();
      toast.success('Orden actualizado');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo reordenar'),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (activity: Activity) => api(`/activities/${activity.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setDeleteActivity(null);
      setDrawerOpen(false);
      setEditingActivity(null);
      toast.success('Actividad eliminada');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar'),
  });

  const createPhaseMutation = useMutation({
    mutationFn: (values: { name: string; color: string | null }) =>
      api<{ phase: Phase }>(`/projects/${projectId}/phases`, { method: 'POST', body: values }),
    onSuccess: () => {
      invalidate();
      setPhaseDialog({ open: false, phase: null });
      setPhaseError('');
      toast.success('Fase creada');
    },
    onError: (error) => setPhaseError(error instanceof ApiError ? error.message : 'No se pudo crear la fase'),
  });

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { name: string; color: string | null } }) =>
      api(`/phases/${id}`, { method: 'PATCH', body: values }),
    onSuccess: () => {
      invalidate();
      setPhaseDialog({ open: false, phase: null });
      setPhaseError('');
      toast.success('Fase actualizada');
    },
    onError: (error) => setPhaseError(error instanceof ApiError ? error.message : 'No se pudo actualizar la fase'),
  });

  const deletePhaseMutation = useMutation({
    mutationFn: (phase: Phase) => api(`/phases/${phase.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setDeletePhase(null);
      toast.success('Fase eliminada');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la fase'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: (values: ProjectSettingsValues) =>
      api(`/projects/${projectId}`, {
        method: 'PATCH',
        body: {
          ...values,
          description: values.description || null,
          code: values.code || null,
          referenceDate: values.referenceDate || null,
        },
      }),
    onSuccess: () => {
      invalidate();
      setSettingsOpen(false);
      setSettingsError('');
      toast.success('Configuración guardada');
    },
    onError: (error) => setSettingsError(error instanceof ApiError ? error.message : 'No se pudo guardar'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => api<{ changed: number }>(`/projects/${projectId}/reschedule`, { method: 'POST' }),
    onSuccess: (result) => {
      invalidate();
      if (result.changed === 0) toast.toast('Las dependencias ya están alineadas. No hubo cambios.', 'info');
      else toast.success(`Se reprogramaron ${result.changed} actividades`);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo reprogramar'),
  });

  const updateDependencyMutation = useMutation({
    mutationFn: ({ dependency: dep, lag }: { dependency: Dependency; lag: number }) =>
      api(`/dependencies/${dep.id}`, { method: 'PATCH', body: { lag } }),
    onSuccess: () => {
      invalidate();
      setDependency(null);
      setDependencyError('');
      toast.success('Dependencia actualizada');
    },
    onError: (error) => setDependencyError(error instanceof ApiError ? error.message : 'No se pudo guardar'),
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: (dep: Dependency) => api(`/dependencies/${dep.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      setDependency(null);
      toast.success('Dependencia eliminada');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar'),
  });

  const saving =
    createActivityMutation.isPending ||
    updateActivityMutation.isPending ||
    duplicateActivityMutation.isPending ||
    moveActivityMutation.isPending ||
    deleteActivityMutation.isPending ||
    createPhaseMutation.isPending ||
    updatePhaseMutation.isPending ||
    deletePhaseMutation.isPending ||
    updateProjectMutation.isPending ||
    rescheduleMutation.isPending ||
    updateDependencyMutation.isPending ||
    deleteDependencyMutation.isPending;

  const openActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityDefaults({});
    setDrawerError('');
    setDrawerOpen(true);
  };

  const openCreateActivity = (defaults: { phaseId?: string | null; parentId?: string | null } = {}) => {
    setEditingActivity(null);
    setActivityDefaults(defaults);
    setDrawerError('');
    setDrawerOpen(true);
  };

  const submitActivity = (values: ActivityFormValues, predecessorIds: string[]) => {
    setDrawerError('');
    if (editingActivity) {
      updateActivityMutation.mutate({
        id: editingActivity.id,
        payload: {
          name: values.name,
          description: values.description || null,
          phaseId: values.phaseId || null,
          parentId: values.parentId || null,
          type: values.type,
          startDate: values.startDate,
          endDate: values.endDate,
          duration: values.duration,
          durationUnit: values.durationUnit,
          progress: values.progress,
          status: values.status,
          priority: values.priority,
          color: values.color,
          assignee: values.assignee || null,
          notes: values.notes || null,
          predecessorIds,
        },
      });
    } else {
      createActivityMutation.mutate({ values, predecessorIds });
    }
  };

  const handleDatesChange = (activity: Activity, startDate: string, endDate: string) => {
    updateActivityMutation.mutate({
      id: activity.id,
      payload: { startDate, endDate },
      silent: true,
    });
  };

  const status = project ? PROJECT_STATUS[project.status] ?? PROJECT_STATUS.planning : null;

  const header = useMemo(() => {
    if (!project) return null;
    return (
      <Box
        sx={{
          flexShrink: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          px: { xs: 1.6, md: 2.6 },
          py: { xs: 1, md: 1.3 },
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: { xs: 1, md: 1.6 },
          flexWrap: 'wrap',
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate('/')}
          sx={{ color: '#64748B', mt: { xs: 0.35, md: 0 } }}
          aria-label="Volver a proyectos"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            backgroundColor: `${project.color}14`,
            border: `1px solid ${project.color}22`,
            display: { xs: 'none', sm: 'grid' },
            placeItems: 'center',
            color: project.color,
            flexShrink: 0,
          }}
        >
          <LayersRoundedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 15, md: 18 },
                fontWeight: 750,
                letterSpacing: '-0.025em',
                color: '#0F172A',
                lineHeight: 1.25,
                maxWidth: { xs: 230, sm: 420, xl: 620 },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.name}
            </Typography>
            {project.code && (
              <Chip
                label={project.code}
                size="small"
                sx={{ height: 20, fontSize: 9.5, fontFamily: 'monospace', backgroundColor: '#F1F5F9', color: '#64748B' }}
              />
            )}
            {status && (
              <Chip
                label={status.label}
                size="small"
                sx={{ height: 20, fontSize: 9.5, backgroundColor: status.bg, color: status.color }}
              />
            )}
            <Chip
              icon={project.schedulingMode === 'automatic' ? <AutoModeRoundedIcon sx={{ fontSize: 12 }} /> : <PanToolAltRoundedIcon sx={{ fontSize: 12 }} />}
              label={project.schedulingMode === 'automatic' ? 'Automático' : 'Manual'}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: 9.5,
                borderColor: '#E2E8F0',
                color: '#64748B',
                display: { xs: 'none', sm: 'inline-flex' },
                '& .MuiChip-icon': { color: '#94A3B8' },
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6, mt: 0.45, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45 }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 12, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>
                {formatDateRange(project.computedStart, project.computedEnd)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45 }}>
              <ChecklistRoundedIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: 10.5, color: '#64748B' }}>
                {project.activityCount} actividades · {project.phaseCount} fases
              </Typography>
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.7 }}>
              <LinearProgress
                variant="determinate"
                value={project.progress}
                sx={{ width: 62, height: 4, backgroundColor: '#EEF2F7', '& .MuiLinearProgress-bar': { backgroundColor: project.color } }}
              />
              <Typography sx={{ fontSize: 10, fontWeight: 750, color: '#475569' }}>{project.progress}%</Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            width: { xs: '100%', md: 'auto' },
            mt: { xs: 0.5, md: 0 },
          }}
        >
          <Chip
            icon={saving ? <CircularProgress size={11} sx={{ color: '#64748B' }} /> : <CloudDoneRoundedIcon sx={{ fontSize: 13 }} />}
            label={saving ? 'Guardando…' : 'Guardado'}
            size="small"
            variant="outlined"
            sx={{
              height: 24,
              fontSize: 9.5,
              color: saving ? '#B45309' : '#047857',
              borderColor: saving ? '#FDE68A' : '#D1FAE5',
              backgroundColor: saving ? '#FFFBEB' : '#F0FDF4',
              display: { xs: 'none', lg: 'flex' },
              '& .MuiChip-icon': { color: saving ? '#B45309' : '#047857' },
            }}
          />
          <Tooltip title="Compartir enlace de solo lectura">
            <Button
              variant="outlined"
              size="small"
              aria-label="Compartir"
              startIcon={<ShareRoundedIcon />}
              onClick={() => setShareOpen(true)}
              sx={{
                minWidth: { xs: 38, sm: 'auto' },
                px: { xs: 1.1, sm: 2 },
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Compartir</Box>
            </Button>
          </Tooltip>
          <Tooltip title="Exportar PDF, PNG, Excel y más">
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
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<LayersRoundedIcon />}
            onClick={() => {
              setPhaseDialog({ open: true, phase: null });
              setPhaseError('');
            }}
            sx={{ display: { xs: 'none', xl: 'inline-flex' } }}
          >
            Nueva fase
          </Button>
          <Button variant="contained" size="small" startIcon={<AddRoundedIcon />} onClick={() => openCreateActivity()}>
            Nueva actividad
          </Button>
          <IconButton size="small" onClick={(event) => setMenuAnchor(event.currentTarget)} sx={{ color: '#64748B' }}>
            <MoreVertRoundedIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setSettingsError('');
                setSettingsOpen(true);
              }}
            >
              <ListItemIcon>
                <TuneRoundedIcon fontSize="small" />
              </ListItemIcon>
              Configuración del proyecto
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setSnapshotsOpen(true);
              }}
            >
              <ListItemIcon>
                <HistoryRoundedIcon fontSize="small" />
              </ListItemIcon>
              Versiones guardadas
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                rescheduleMutation.mutate();
              }}
            >
              <ListItemIcon>
                <UpdateRoundedIcon fontSize="small" />
              </ListItemIcon>
              Reprogramar dependencias
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                setPhaseDialog({ open: true, phase: null });
                setPhaseError('');
              }}
            >
              <ListItemIcon>
                <AddRoundedIcon fontSize="small" />
              </ListItemIcon>
              Nueva fase
            </MenuItem>
            <MenuItem
              onClick={() => {
                setMenuAnchor(null);
                openCreateActivity();
              }}
            >
              <ListItemIcon>
                <AddRoundedIcon fontSize="small" />
              </ListItemIcon>
              Nueva actividad
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    );
  }, [project, saving, menuAnchor, status, activities.length]);

  if (projectQuery.isLoading) {
    return (
      <Box sx={{ flex: 1, p: 3 }}>
        <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height="calc(100vh - 180px)" />
      </Box>
    );
  }

  if (projectQuery.isError || !bundle || !project) {
    return (
      <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
        <Alert severity="error" sx={{ maxWidth: 420 }}>
          {projectQuery.error instanceof ApiError ? projectQuery.error.message : 'No se pudo cargar el proyecto'}
          <Box sx={{ mt: 1.5 }}>
            <Button size="small" onClick={() => navigate('/')}>
              Volver a proyectos
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#F5F7FB' }}>
      {header}
      <Box sx={{ flex: 1, minHeight: 0, p: { xs: 1, md: 1.6 }, pt: { xs: 1, md: 1.4 }, display: 'flex' }}>
        <GanttView
          project={project}
          phases={phases}
          activities={activities}
          dependencies={dependencies}
          onOpenActivity={openActivity}
          onCreateActivity={openCreateActivity}
          onDuplicateActivity={(activity) => duplicateActivityMutation.mutate(activity)}
          onDeleteActivity={(activity) => setDeleteActivity(activity)}
          onMoveActivity={(activity, direction) => moveActivityMutation.mutate({ activity, direction })}
          onEditPhase={(phase) => {
            setPhaseDialog({ open: true, phase });
            setPhaseError('');
          }}
          onDeletePhase={(phase) => setDeletePhase(phase)}
          onCreatePhase={() => {
            setPhaseDialog({ open: true, phase: null });
            setPhaseError('');
          }}
          onDatesChange={handleDatesChange}
          onDependencyClick={(dep) => {
            setDependency(dep);
            setDependencyError('');
          }}
        />
      </Box>

      <ActivityDrawer
        open={drawerOpen}
        project={project}
        phases={phases}
        activities={activities}
        dependencies={dependencies}
        activity={editingActivity}
        defaults={activityDefaults}
        saving={createActivityMutation.isPending || updateActivityMutation.isPending}
        serverError={drawerError}
        onClose={() => {
          if (createActivityMutation.isPending || updateActivityMutation.isPending) return;
          setDrawerOpen(false);
          setEditingActivity(null);
          setDrawerError('');
        }}
        onSubmit={submitActivity}
        onDelete={(activity) => {
          setDrawerOpen(false);
          setDeleteActivity(activity);
        }}
        onDuplicate={(activity) => duplicateActivityMutation.mutate(activity)}
      />

      <PhaseDialog
        open={phaseDialog.open}
        phase={phaseDialog.phase}
        phaseIndex={phases.length}
        saving={createPhaseMutation.isPending || updatePhaseMutation.isPending}
        serverError={phaseError}
        onClose={() => {
          if (createPhaseMutation.isPending || updatePhaseMutation.isPending) return;
          setPhaseDialog({ open: false, phase: null });
          setPhaseError('');
        }}
        onSubmit={(values) => {
          if (phaseDialog.phase) updatePhaseMutation.mutate({ id: phaseDialog.phase.id, values });
          else createPhaseMutation.mutate(values);
        }}
      />

      <ProjectSettingsDialog
        open={settingsOpen}
        project={project}
        saving={updateProjectMutation.isPending}
        serverError={settingsError}
        onClose={() => {
          if (updateProjectMutation.isPending) return;
          setSettingsOpen(false);
          setSettingsError('');
        }}
        onSubmit={(values) => updateProjectMutation.mutate(values)}
      />

      <ShareDialog
        open={shareOpen}
        projectId={projectId}
        projectName={project.name}
        onClose={() => setShareOpen(false)}
      />

      <SnapshotsDialog
        open={snapshotsOpen}
        projectId={projectId}
        projectName={project.name}
        onClose={() => setSnapshotsOpen(false)}
        onView={(snapshotId) => navigate(`/projects/${projectId}/versions/${snapshotId}`)}
      />

      <ExportDialog
        open={exportOpen}
        project={project}
        phases={phases}
        activities={activities}
        dependencies={dependencies}
        initialScale={project.defaultScale}
        onClose={() => setExportOpen(false)}
      />

      <DependencyDialog
        open={Boolean(dependency)}
        dependency={dependency}
        project={project}
        activities={activities}
        saving={updateDependencyMutation.isPending || deleteDependencyMutation.isPending}
        serverError={dependencyError}
        onClose={() => {
          if (updateDependencyMutation.isPending || deleteDependencyMutation.isPending) return;
          setDependency(null);
          setDependencyError('');
        }}
        onSave={(lag) => dependency && updateDependencyMutation.mutate({ dependency, lag })}
        onDelete={() => dependency && deleteDependencyMutation.mutate(dependency)}
      />

      <ConfirmDialog
        open={Boolean(deleteActivity)}
        title="Eliminar actividad"
        description={
          <>
            Se eliminará <b>{deleteActivity?.name}</b> y sus dependencias. Las subactividades quedarán sin padre.
            Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar actividad"
        danger
        loading={deleteActivityMutation.isPending}
        onClose={() => setDeleteActivity(null)}
        onConfirm={() => deleteActivity && deleteActivityMutation.mutate(deleteActivity)}
      />

      <ConfirmDialog
        open={Boolean(deletePhase)}
        title="Eliminar fase"
        description={
          <>
            Se eliminará la fase <b>{deletePhase?.name}</b>. Sus actividades no se eliminan: quedarán en «Sin fase».
          </>
        }
        confirmLabel="Eliminar fase"
        danger
        loading={deletePhaseMutation.isPending}
        onClose={() => setDeletePhase(null)}
        onConfirm={() => deletePhase && deletePhaseMutation.mutate(deletePhase)}
      />
    </Box>
  );
}
