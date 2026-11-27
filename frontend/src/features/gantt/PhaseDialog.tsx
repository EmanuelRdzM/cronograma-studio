import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { Phase } from '@/api/types';
import { PHASE_PALETTE } from '@/lib/labels';

interface PhaseDialogProps {
  open: boolean;
  phase?: Phase | null;
  phaseIndex?: number;
  saving?: boolean;
  serverError?: string;
  onClose: () => void;
  onSubmit: (values: { name: string; color: string | null }) => void;
}

export function PhaseDialog({
  open,
  phase,
  phaseIndex = 0,
  saving = false,
  serverError,
  onClose,
  onSubmit,
}: PhaseDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(phase?.name ?? '');
    setColor(phase?.color ?? null);
    setError('');
  }, [open, phase]);

  const submit = () => {
    if (!name.trim()) {
      setError('Escribe un nombre para la fase');
      return;
    }
    onSubmit({ name: name.trim(), color });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{phase ? 'Editar fase' : 'Nueva fase'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {serverError && <Alert severity="error">{serverError}</Alert>}
        <TextField
          label="Nombre de la fase"
          placeholder="Ej. Fase 2 — Desarrollo"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          error={Boolean(error)}
          helperText={error || 'Agrupa actividades relacionadas dentro del cronograma.'}
          autoFocus
        />
        <Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#475569', mb: 1 }}>Color de la fase</Typography>
          <Box sx={{ display: 'flex', gap: 0.9, flexWrap: 'wrap' }}>
            <Box
              component="button"
              type="button"
              onClick={() => setColor(null)}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.2,
                border: '1px dashed #CBD5E1',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 9,
                color: '#94A3B8',
                boxShadow: color === null ? '0 0 0 2px #fff, 0 0 0 4px #4F46E5' : 'none',
              }}
              title="Color automático"
            >
              Auto
            </Box>
            {PHASE_PALETTE.map((item) => (
              <Box
                key={item}
                component="button"
                type="button"
                onClick={() => setColor(item)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.2,
                  border: 'none',
                  backgroundColor: item,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  boxShadow: color === item ? '0 0 0 2px #fff, 0 0 0 4px #4F46E5' : 'none',
                }}
                aria-label={`Color ${item}`}
              >
                {color === item && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: 10, color: '#94A3B8', mt: 0.8 }}>
            Si eliges automático, se asigna un color de la paleta según la posición de la fase.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={submit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} color="inherit" /> : phase ? 'Guardar fase' : 'Crear fase'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
