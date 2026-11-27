import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { api, ApiError } from '@/api/client';
import type { Project, ProjectStatus } from '@/api/types';
import { PROJECT_STATUS } from '@/lib/labels';
import { formatDateRange, relativeTime } from '@/lib/dates';
import { ProjectFormDialog, type ProjectFormValues } from '@/features/projects/ProjectFormDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';

type StatusFilter = 'all' | ProjectStatus;
type SortKey = 'updated' | 'name' | 'start' | 'end';

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'planning', label: 'Planeación' },
  { value: 'paused', label: 'En pausa' },
  { value: 'completed', label: 'Completados' },
  { value: 'archived', label: 'Archivados' },
];

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid #E6EBF2',
        display: 'flex',
        alignItems: 'center',
        gap: 1.6,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: `${accent}12`,
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 650, letterSpacing: '.08em', color: '#94A3B8', textTransform: 'uppercase' }} noWrap>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8 }}>
          <Typography sx={{ fontSize: 21, fontWeight: 750, letterSpacing: '-0.03em', color: '#0F172A', lineHeight: 1.35 }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: '#94A3B8', display: { xs: 'none', sm: 'block' } }} noWrap>
            {hint}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

function ProjectCard({
  project,
  onOpen,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.planning;
  const archived = Boolean(project.archivedAt) || project.status === 'archived';

  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      sx={{
        position: 'relative',
        borderRadius: 3.5,
        border: '1px solid #E6EBF2',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 252,
        opacity: archived ? 0.72 : 1,
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: '#C7D2FE',
          boxShadow: '0 14px 34px rgba(15,23,42,.09)',
        },
        '&:hover .open-arrow': { transform: 'translateX(3px)', color: project.color },
      }}
    >
      <Box sx={{ height: 4, backgroundColor: project.color }} />
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.4 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.2,
              backgroundColor: `${project.color}14`,
              border: `1px solid ${project.color}24`,
              color: project.color,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <FolderRoundedIcon sx={{ fontSize: 21 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontSize: 15.5,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#0F172A',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.3,
                }}
                title={project.name}
              >
                {project.name}
              </Typography>
              {project.code && (
                <Chip
                  label={project.code}
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontFamily: 'monospace', bgcolor: '#F1F5F9', color: '#64748B' }}
                />
              )}
            </Box>
            <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.3 }}>
              Actualizado {relativeTime(project.updatedAt)}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setAnchorEl(event.currentTarget);
            }}
            sx={{ color: '#94A3B8', mt: -0.4, mr: -0.6 }}
            aria-label="Opciones del proyecto"
          >
            <MoreHorizRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.7, mt: 1.6, flexWrap: 'wrap' }}>
          <Chip
            label={status.label}
            size="small"
            sx={{ height: 22, fontSize: 10.5, backgroundColor: status.bg, color: status.color }}
          />
          <Chip
            label={project.schedulingMode === 'automatic' ? 'Automático' : 'Manual'}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: 10.5, borderColor: '#E2E8F0', color: '#64748B' }}
          />
        </Box>

        <Typography
          sx={{
            mt: 1.5,
            fontSize: 12.5,
            lineHeight: 1.55,
            color: project.description ? '#64748B' : '#B6C2D2',
            fontStyle: project.description ? 'normal' : 'italic',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 38,
          }}
        >
          {project.description || 'Sin descripción'}
        </Typography>

        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.6 }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 650, color: '#64748B' }}>Avance general</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 750, color: project.progress > 0 ? '#0F172A' : '#94A3B8' }}>
              {project.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={project.progress}
            sx={{
              height: 5,
              backgroundColor: '#EEF2F7',
              '& .MuiLinearProgress-bar': { backgroundColor: project.color },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8, mt: 1.8, color: '#94A3B8' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: 10.5 }} noWrap>
                {formatDateRange(project.computedStart, project.computedEnd)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
              <ChecklistRoundedIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 10.5 }}>{project.activityCount}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.4 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#4F46E5' }}>Abrir cronograma</Typography>
            <ArrowForwardRoundedIcon className="open-arrow" sx={{ fontSize: 17, color: '#94A3B8', transition: 'all 150ms ease' }} />
          </Box>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onClick={(event) => event.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onEdit();
          }}
        >
          <ListItemIcon>
            <EditRoundedIcon fontSize="small" />
          </ListItemIcon>
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onDuplicate();
          }}
        >
          <ListItemIcon>
            <ContentCopyRoundedIcon fontSize="small" />
          </ListItemIcon>
          Duplicar
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onArchive();
          }}
        >
          <ListItemIcon>
            {archived ? <UnarchiveRoundedIcon fontSize="small" /> : <ArchiveRoundedIcon fontSize="small" />}
          </ListItemIcon>
          {archived ? 'Reactivar' : 'Archivar'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlineRoundedIcon fontSize="small" color="error" />
          </ListItemIcon>
          Eliminar
        </MenuItem>
      </Menu>
    </Paper>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<{ projects: Project[] }>('/projects'),
  });

  const projects = projectsQuery.data?.projects ?? [];

  const createMutation = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      api<{ project: Project }>('/projects', { method: 'POST', body: values }),
    onSuccess: ({ project }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setFormOpen(false);
      setEditing(null);
      setFormError('');
      toast.success(`Proyecto "${project.name}" creado`);
      navigate(`/projects/${project.id}`);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : 'No se pudo crear el proyecto'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ProjectFormValues) =>
      api<{ project: Project }>(`/projects/${editing?.id}`, { method: 'PATCH', body: values }),
    onSuccess: ({ project }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setFormOpen(false);
      setEditing(null);
      setFormError('');
      toast.success('Proyecto actualizado');
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : 'No se pudo guardar'),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, project }: { action: 'archive' | 'unarchive' | 'duplicate' | 'delete'; project: Project }) => {
      if (action === 'archive' || action === 'unarchive') {
        return api(`/projects/${project.id}/archive`, {
          method: 'POST',
          body: { archived: action === 'archive' },
        });
      }
      if (action === 'duplicate') {
        return api(`/projects/${project.id}/duplicate`, { method: 'POST' });
      }
      return api(`/projects/${project.id}`, { method: 'DELETE' });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const messages = {
        archive: 'Proyecto archivado',
        unarchive: 'Proyecto reactivado',
        duplicate: 'Proyecto duplicado',
        delete: 'Proyecto eliminado',
      };
      toast.success(messages[variables.action]);
      if (variables.action === 'delete') setDeleteTarget(null);
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo completar la acción'),
  });

  const filtered = useMemo(() => {
    let list = [...projects];
    if (statusFilter !== 'all') list = list.filter((project) => project.status === statusFilter);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (project) =>
          project.name.toLowerCase().includes(term) ||
          project.description?.toLowerCase().includes(term) ||
          project.code?.toLowerCase().includes(term),
      );
    }
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort === 'start') return a.computedStart.localeCompare(b.computedStart);
      if (sort === 'end') return a.computedEnd.localeCompare(b.computedEnd);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [projects, statusFilter, search, sort]);

  const nonArchived = projects.filter((project) => project.status !== 'archived');
  const activeCount = projects.filter((project) => project.status === 'active').length;
  const avgProgress = nonArchived.length
    ? Math.round(nonArchived.reduce((sum, project) => sum + project.progress, 0) / nonArchived.length)
    : 0;
  const totalActivities = projects.reduce((sum, project) => sum + project.activityCount, 0);

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };

  return (
    <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 280,
          background: 'radial-gradient(ellipse 68% 100% at 26% 0%, rgba(79,70,229,.075), transparent 68%)',
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ position: 'relative', maxWidth: 1500, mx: 'auto', px: { xs: 2, sm: 3, lg: 4.5 }, pt: { xs: 2.5, md: 4 }, pb: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.15em', color: '#4F46E5', textTransform: 'uppercase' }}>
              Panel de proyectos
            </Typography>
            <Typography variant="h1" sx={{ mt: 0.7 }}>
              Tus cronogramas
            </Typography>
            <Typography sx={{ mt: 0.8, color: '#64748B', fontSize: 13.5, maxWidth: 520 }}>
              Crea, edita y comparte la planeación de tus proyectos. Todo en un mismo lugar, sin código.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, sm: 1.6 } }}>
            <Button
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => navigate('/import')}
              sx={{ px: { xs: 1.2, sm: 1.8 } }}
            >
              Importar
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, ml: 0.5 }}>
                PlantUML
              </Box>
            </Button>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
              Nuevo proyecto
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 1.5, mt: 3.2 }}>
          <StatCard icon={<FolderRoundedIcon fontSize="small" />} label="Proyectos" value={String(projects.length)} hint="en total" accent="#4F46E5" />
          <StatCard icon={<BoltRoundedIcon fontSize="small" />} label="Activos" value={String(activeCount)} hint="en marcha" accent="#0E7490" />
          <StatCard icon={<TrendingUpRoundedIcon fontSize="small" />} label="Avance" value={`${avgProgress}%`} hint="promedio" accent="#047857" />
          <StatCard icon={<FormatListBulletedRoundedIcon fontSize="small" />} label="Actividades" value={String(totalActivities)} hint="planeadas" accent="#B45309" />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 3.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar proyecto…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: '100%', sm: 270 }, backgroundColor: '#fff', borderRadius: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', flex: 1 }}>
            {FILTERS.map((filter) => {
              const selected = statusFilter === filter.value;
              const count =
                filter.value === 'all'
                  ? projects.length
                  : projects.filter((project) => project.status === filter.value).length;
              return (
                <Button
                  key={filter.value}
                  size="small"
                  onClick={() => setStatusFilter(filter.value)}
                  sx={{
                    minHeight: 30,
                    px: 1.4,
                    borderRadius: 999,
                    color: selected ? '#3730A3' : '#64748B',
                    backgroundColor: selected ? '#EEF2FF' : '#fff',
                    border: selected ? '1px solid #C7D2FE' : '1px solid #E6EBF2',
                    fontWeight: selected ? 700 : 550,
                    fontSize: 11.5,
                    '&:hover': { backgroundColor: selected ? '#E0E7FF' : '#F8FAFC' },
                  }}
                >
                  {filter.label}
                  <Box component="span" sx={{ ml: 0.7, fontSize: 10, color: selected ? '#6366F1' : '#B0BBC9' }}>
                    {count}
                  </Box>
                </Button>
              );
            })}
          </Box>
          <Select
            size="small"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            sx={{ minWidth: 150, backgroundColor: '#fff', fontSize: 12.5, '& fieldset': { borderColor: '#E6EBF2' } }}
          >
            <MenuItem value="updated">Actualizados</MenuItem>
            <MenuItem value="name">Nombre A–Z</MenuItem>
            <MenuItem value="start">Inicio</MenuItem>
            <MenuItem value="end">Fin</MenuItem>
          </Select>
        </Box>

        {projectsQuery.isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {projectsQuery.error instanceof ApiError ? projectsQuery.error.message : 'No se pudieron cargar los proyectos'}
          </Alert>
        )}

        {projectsQuery.isLoading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(3, 1fr)' }, gap: 2, mt: 2.5 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} variant="rounded" height={252} sx={{ borderRadius: 3.5 }} />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              mt: 2.5,
              p: { xs: 4, sm: 7 },
              borderRadius: 4,
              border: '1px dashed #D7DEEA',
              backgroundColor: 'rgba(255,255,255,.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: 3,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: '#EEF2FF',
                color: '#6366F1',
                mb: 2,
              }}
            >
              <FolderRoundedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
              {projects.length === 0 ? 'Aún no tienes proyectos' : 'No hay proyectos con ese filtro'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748B', mt: 0.7, maxWidth: 400 }}>
              {projects.length === 0
                ? 'Crea un proyecto desde cero o importa un cronograma PlantUML existente para empezar.'
                : 'Cambia el filtro o limpia la búsqueda para ver otros proyectos.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 2.5 }}>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
                Nuevo proyecto
              </Button>
              <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => navigate('/import')}>
                Importar
              </Button>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(3, 1fr)' }, gap: 2, mt: 2.5 }}>
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate(`/projects/${project.id}`)}
                onEdit={() => {
                  setEditing(project);
                  setFormError('');
                  setFormOpen(true);
                }}
                onDuplicate={() => actionMutation.mutate({ action: 'duplicate', project })}
                onArchive={() =>
                  actionMutation.mutate({
                    action: project.status === 'archived' ? 'unarchive' : 'archive',
                    project,
                  })
                }
                onDelete={() => setDeleteTarget(project)}
              />
            ))}
          </Box>
        )}
      </Box>

      <ProjectFormDialog
        open={formOpen}
        project={editing}
        saving={createMutation.isPending || updateMutation.isPending}
        serverError={formError}
        onClose={() => {
          if (createMutation.isPending || updateMutation.isPending) return;
          setFormOpen(false);
          setEditing(null);
          setFormError('');
        }}
        onSubmit={(values) => {
          setFormError('');
          if (editing) updateMutation.mutate(values);
          else createMutation.mutate(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar proyecto"
        description={
          <>
            Se eliminará <b>{deleteTarget?.name}</b> con sus actividades, dependencias, enlaces compartidos y versiones.
            Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar definitivamente"
        danger
        loading={actionMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) actionMutation.mutate({ action: 'delete', project: deleteTarget });
        }}
      />
    </Box>
  );
}
