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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { api, ApiError } from '@/api/client';
import type { ShareLink } from '@/api/types';
import { formatDateTime, formatLongDate } from '@/lib/dates';
import { useToast } from '@/components/ToastProvider';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ShareDialogProps {
  open: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

function buildUrl(token: string) {
  return `${window.location.origin}/share/${token}`;
}

export function ShareDialog({ open, projectId, projectName, onClose }: ShareDialogProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [password, setPassword] = useState('');
  const [created, setCreated] = useState<{ link: ShareLink; token: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShareLink | null>(null);

  const linksQuery = useQuery({
    queryKey: ['share-links', projectId],
    queryFn: () => api<{ links: ShareLink[] }>(`/projects/${projectId}/share-links`),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setCreated(null);
      setLabel('');
      setExpiresAt('');
      setPassword('');
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () =>
      api<{ link: ShareLink }>(`/projects/${projectId}/share-links`, {
        method: 'POST',
        body: {
          label: label.trim() || undefined,
          expiresAt: expiresAt || null,
          password: password ? password : null,
        },
      }),
    onSuccess: ({ link }) => {
      setCreated({ link, token: link.token! });
      setLabel('');
      setExpiresAt('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['share-links', projectId] });
      toast.success('Enlace de solo lectura creado');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo crear el enlace'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ link, isActive }: { link: ShareLink; isActive: boolean }) =>
      api(`/projects/${projectId}/share-links/${link.id}`, { method: 'PATCH', body: { isActive } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links', projectId] });
      toast.success('Enlace actualizado');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (link: ShareLink) =>
      api(`/projects/${projectId}/share-links/${link.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links', projectId] });
      setDeleteTarget(null);
      toast.success('Enlace revocado');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'No se pudo revocar'),
  });

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      toast.success('Enlace copiado');
    }
  };

  const links = linksQuery.data?.links ?? [];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
              <LinkRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 17, fontWeight: 730, letterSpacing: '-0.02em' }}>Compartir cronograma</Typography>
              <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }}>{projectName}</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.2,
              p: 1.5,
              borderRadius: 2,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E8EDF4',
              mb: 2.2,
            }}
          >
            <PublicRoundedIcon sx={{ fontSize: 17, color: '#0E7490', mt: 0.1 }} />
            <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.55 }}>
              Cualquiera con el enlace puede <b>consultar</b> el cronograma sin iniciar sesión, pero no editarlo.
              Verá los cambios al recargar o automáticamente cada 30 segundos.
            </Typography>
          </Box>

          {created && (
            <Alert
              severity="success"
              icon={<LinkRoundedIcon fontSize="small" />}
              sx={{ mb: 2.2, alignItems: 'flex-start', '& .MuiAlert-message': { width: '100%', minWidth: 0 } }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 650, mb: 0.5 }}>Enlace creado</Typography>
              <Typography sx={{ fontSize: 10.5, mb: 0.9 }}>
                Cópialo ahora. Por seguridad no guardamos el enlace completo; si lo pierdes, crea uno nuevo.
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                <TextField
                  value={buildUrl(created.token)}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true, sx: { fontSize: 11, backgroundColor: '#fff' } }}
                />
                <Tooltip title="Copiar enlace">
                  <IconButton size="small" onClick={() => copy(buildUrl(created.token))} sx={{ backgroundColor: '#fff' }}>
                    <ContentCopyRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Abrir vista previa">
                  <IconButton
                    size="small"
                    onClick={() => window.open(buildUrl(created.token), '_blank', 'noopener,noreferrer')}
                    sx={{ backgroundColor: '#fff' }}
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {created.link.expiresAt && (
                <Typography sx={{ fontSize: 10, mt: 0.8 }}>
                  Expira el {formatLongDate(created.link.expiresAt.slice(0, 10))}
                  {' · '}requiere contraseña si la configuraste.
                </Typography>
              )}
            </Alert>
          )}

          <Box sx={{ p: 1.8, borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 680, color: '#0F172A', mb: 1.4 }}>
              Crear un enlace nuevo
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="Etiqueta (opcional)"
                placeholder="Ej. Para dirección"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                size="small"
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.2 }}>
                <TextField
                  label="Expira el (opcional)"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label="Contraseña (opcional)"
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: <LockOutlinedIcon sx={{ fontSize: 15, color: '#94A3B8', mr: 0.6 }} />,
                  }}
                />
              </Box>
              <Button
                variant="contained"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || (password.length > 0 && password.length < 4)}
                startIcon={createMutation.isPending ? <CircularProgress size={15} color="inherit" /> : <LinkRoundedIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Crear enlace de solo lectura
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 2.4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
              <HistoryRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
              <Typography sx={{ fontSize: 12, fontWeight: 680, color: '#334155' }}>Enlaces existentes</Typography>
              <Chip label={links.length} size="small" sx={{ height: 18, fontSize: 9.5, backgroundColor: '#F1F5F9', color: '#64748B' }} />
            </Box>
            {linksQuery.isLoading ? (
              <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={20} />
              </Box>
            ) : links.length === 0 ? (
              <Typography sx={{ fontSize: 11.5, color: '#94A3B8', py: 1.5 }}>
                Aún no hay enlaces. Crea el primero para compartir el cronograma.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {links.map((link) => {
                  const expired = link.expiresAt ? new Date(link.expiresAt).getTime() < Date.now() : false;
                  return (
                    <Box
                      key={link.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.2,
                        p: 1.2,
                        borderRadius: 2,
                        border: '1px solid #EEF2F7',
                        backgroundColor: link.isActive && !expired ? '#fff' : '#FAFBFC',
                        opacity: link.isActive && !expired ? 1 : 0.7,
                      }}
                    >
                      <Box sx={{ width: 28, height: 28, borderRadius: 1.5, display: 'grid', placeItems: 'center', backgroundColor: link.isActive ? '#ECFDF5' : '#F1F5F9', color: link.isActive ? '#047857' : '#94A3B8', flexShrink: 0 }}>
                        <LinkRoundedIcon sx={{ fontSize: 15 }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#334155' }} noWrap>
                            {link.label || `Enlace ${link.tokenPrefix}…`}
                          </Typography>
                          <Chip
                            label={expired ? 'Expirado' : link.isActive ? 'Activo' : 'Inactivo'}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 8.5,
                              backgroundColor: expired ? '#FEE2E2' : link.isActive ? '#D1FAE5' : '#F1F5F9',
                              color: expired ? '#B91C1C' : link.isActive ? '#047857' : '#64748B',
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: 9.5, color: '#94A3B8', mt: 0.2 }}>
                          Creado {formatDateTime(link.createdAt)}
                          {link.expiresAt ? ` · Expira ${formatLongDate(link.expiresAt.slice(0, 10))}` : ''}
                          {link.lastAccessedAt ? ` · Último acceso ${formatDateTime(link.lastAccessedAt)}` : ' · Sin accesos'}
                        </Typography>
                      </Box>
                      <Tooltip title={link.isActive ? 'Desactivar enlace' : 'Reactivar enlace'}>
                        <Switch
                          size="small"
                          checked={link.isActive}
                          onChange={(event) =>
                            toggleMutation.mutate({ link, isActive: event.target.checked })
                          }
                        />
                      </Tooltip>
                      <Tooltip title="Revocar definitivamente">
                        <IconButton size="small" onClick={() => setDeleteTarget(link)} sx={{ color: '#DC2626' }}>
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Revocar enlace"
        description="El enlace dejará de funcionar de inmediato para cualquier persona que lo tenga. Esta acción no se puede deshacer."
        confirmLabel="Revocar enlace"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </>
  );
}
