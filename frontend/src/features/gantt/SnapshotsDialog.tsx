import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded';
import { api, ApiError } from '@/api/client';
import type { SnapshotDetail, SnapshotMeta } from '@/api/types';
import { formatDateTime } from '@/lib/dates';
import { useToast } from '@/components/ToastProvider';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface SnapshotsDialogProps {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onView: (snapshotId: string) => void;
}

export function SnapshotsDialog({ open, projectId, projectName, onClose, onView }: SnapshotsDialogProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SnapshotMeta | null>(null);

  useEffect(() => {
    if (!open) setName('');
  }, [open]);

  const query = useQuery({
    queryKey: ['snapshots', projectId],
    queryFn: () => api<{ snapshots: SnapshotMeta[] }>(`/projects/${projectId}/snapshots`),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api<{ snapshot: SnapshotMeta }>(`/projects/${projectId}/snapshots`, {
        method: 'POST',
        body: { name: name.trim() || undefined },
      }),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['snapshots', projectId] });
      toast.success('Versión guardada');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo guardar la versión'),
  });

  const deleteMutation = useMutation({
    mutationFn: (snapshot: SnapshotMeta) =>
      api(`/projects/${projectId}/snapshots/${snapshot.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', projectId] });
      setDeleteTarget(null);
      toast.success('Versión eliminada');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo eliminar'),
  });

  const download = async (snapshot: SnapshotMeta) => {
    try {
      const result = await api<{ snapshot: SnapshotDetail }>(
        `/projects/${projectId}/snapshots/${snapshot.id}`,
      );
      const blob = new Blob([JSON.stringify(result.snapshot.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${projectName.replace(/[^\w\- ]/g, '')}-${snapshot.name.replace(/[^\w\- ]/g, '')}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo descargar');
    }
  };

  const snapshots = query.data?.snapshots ?? [];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#ECFEFF', color: '#0E7490' }}>
              <HistoryRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 730, letterSpacing: '-0.02em' }}>Versiones guardadas</Typography>
              <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>{projectName}</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Alert severity="info" sx={{ fontSize: 11.5, mb: 2.2 }}>
            Una versión congela el cronograma tal como está hoy. No cambia cuando sigues editando el proyecto.
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Nombre de la versión (opcional)"
              placeholder="Ej. Entrega a dirección"
              value={name}
              onChange={(event) => setName(event.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={createMutation.isPending ? <CircularProgress size={15} color="inherit" /> : <CameraAltRoundedIcon />}
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              sx={{ minHeight: 40 }}
            >
              Guardar versión
            </Button>
          </Box>

          <Divider sx={{ my: 2.2 }} />

          {query.isLoading ? (
            <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : snapshots.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <HistoryRoundedIcon sx={{ fontSize: 30, color: '#CBD5E1', mb: 1 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 650, color: '#475569' }}>Aún no hay versiones</Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8', mt: 0.4 }}>
                Guarda una versión antes de compartir o de hacer cambios grandes.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
              {snapshots.map((snapshot) => (
                <Box
                  key={snapshot.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2,
                    p: 1.3,
                    borderRadius: 2,
                    border: '1px solid #EEF2F7',
                  }}
                >
                  <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: 'grid', placeItems: 'center', backgroundColor: '#F0F9FF', color: '#0E7490' }}>
                    <HistoryRoundedIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#334155' }} noWrap>
                      {snapshot.name}
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>{formatDateTime(snapshot.createdAt)}</Typography>
                  </Box>
                  <Tooltip title="Ver esta versión">
                    <IconButton size="small" onClick={() => onView(snapshot.id)} sx={{ color: '#4F46E5' }}>
                      <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Descargar JSON">
                    <IconButton size="small" onClick={() => download(snapshot)} sx={{ color: '#64748B' }}>
                      <DownloadRoundedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar versión">
                    <IconButton size="small" onClick={() => setDeleteTarget(snapshot)} sx={{ color: '#DC2626' }}>
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar versión"
        description={`Se eliminará la versión "${deleteTarget?.name ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </>
  );
}
