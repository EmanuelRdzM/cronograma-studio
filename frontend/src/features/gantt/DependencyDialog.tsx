import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import type { Activity, Dependency, Project } from '@/api/types';
import { formatShortDate } from '@/lib/dates';

interface DependencyDialogProps {
  open: boolean;
  dependency: Dependency | null;
  project: Project;
  activities: Activity[];
  saving?: boolean;
  serverError?: string;
  onClose: () => void;
  onSave: (lag: number) => void;
  onDelete: () => void;
}

export function DependencyDialog({
  open,
  dependency,
  project,
  activities,
  saving = false,
  serverError,
  onClose,
  onSave,
  onDelete,
}: DependencyDialogProps) {
  const [lag, setLag] = useState(0);
  useEffect(() => {
    if (open && dependency) setLag(dependency.lag ?? 0);
  }, [open, dependency]);

  const predecessor = activities.find((activity) => activity.id === dependency?.predecessorId);
  const successor = activities.find((activity) => activity.id === dependency?.successorId);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: 'grid', placeItems: 'center', backgroundColor: '#F1F5F9', color: '#475569' }}>
            <LinkRoundedIcon sx={{ fontSize: 16 }} />
          </Box>
          Dependencia Fin → Inicio
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {serverError && <Alert severity="error">{serverError}</Alert>}
        <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid #E8EDF4', backgroundColor: '#FBFCFE' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 750, letterSpacing: '.07em', color: '#94A3B8', textTransform: 'uppercase' }}>
                Predecesora
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#334155' }} noWrap>
                {predecessor?.name ?? '—'}
              </Typography>
              {predecessor && (
                <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>
                  {formatShortDate(predecessor.startDate)} → {formatShortDate(predecessor.endDate)}
                </Typography>
              )}
            </Box>
            <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 9, fontWeight: 750, letterSpacing: '.07em', color: '#94A3B8', textTransform: 'uppercase' }}>
                Sucesora
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#334155' }} noWrap>
                {successor?.name ?? '—'}
              </Typography>
              {successor && (
                <Typography sx={{ fontSize: 9.5, color: '#94A3B8' }}>
                  {formatShortDate(successor.startDate)} → {formatShortDate(successor.endDate)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
        <TextField
          label="Retraso (días laborables)"
          type="number"
          value={lag}
          onChange={(event) => setLag(Math.max(0, Math.min(365, Number(event.target.value) || 0)))}
          helperText="0 = la sucesora inicia el siguiente día laborable después de la predecesora."
        />
        <Alert severity="info" sx={{ fontSize: 10.5 }}>
          {project.schedulingMode === 'automatic'
            ? 'El proyecto está en modo automático: al guardar se reprogramarán las actividades dependientes.'
            : 'El proyecto está en modo manual: la dependencia se mostrará, pero no moverá fechas automáticamente.'}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <IconButton onClick={onDelete} disabled={saving} sx={{ color: '#DC2626' }} aria-label="Eliminar dependencia">
          <DeleteOutlineRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => onSave(lag)} disabled={saving}>
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Guardar'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
