import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { Project, ProjectStatus } from '@/api/types';
import { PROJECT_STATUS } from '@/lib/labels';
import { todayISO } from '@/lib/dates';

const COLORS = ['#4F46E5', '#0E7490', '#047857', '#B45309', '#BE123C', '#7C3AED', '#0F766E', '#475569'];

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  description: z.string().max(4000).optional(),
  code: z.string().max(40).optional(),
  startDate: z.string().min(1, 'Selecciona una fecha'),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'archived']),
  color: z.string(),
});

export type ProjectFormValues = z.infer<typeof schema>;

interface ProjectFormDialogProps {
  open: boolean;
  project?: Project | null;
  saving?: boolean;
  serverError?: string;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => void;
}

export function ProjectFormDialog({
  open,
  project,
  saving = false,
  serverError,
  onClose,
  onSubmit,
}: ProjectFormDialogProps) {
  const [selectedColor, setSelectedColor] = useState(project?.color || COLORS[0]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      code: '',
      startDate: todayISO(),
      status: 'planning',
      color: COLORS[0],
    },
  });

  useEffect(() => {
    if (!open) return;
    const color = project?.color || COLORS[0];
    setSelectedColor(color);
    reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      code: project?.code ?? '',
      startDate: project?.startDate ?? todayISO(),
      status: project?.status ?? 'planning',
      color,
    });
  }, [open, project, reset]);

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{project ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {serverError && <Alert severity="error">{serverError}</Alert>}
          <TextField
            label="Nombre del proyecto"
            placeholder="Ej. Lanzamiento del sitio web"
            autoFocus
            {...register('name')}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
          />
          <TextField
            label="Descripción"
            placeholder="Objetivo, alcance o contexto del proyecto"
            multiline
            minRows={2}
            {...register('description')}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label="Código (opcional)" placeholder="WEB-2026" {...register('code')} />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField select label="Estado" {...field}>
                  {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((status) => (
                    <MenuItem key={status} value={status}>
                      {PROJECT_STATUS[status].label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Fecha de inicio"
              type="date"
              {...register('startDate')}
              InputLabelProps={{ shrink: true }}
              error={Boolean(errors.startDate)}
              helperText={errors.startDate?.message}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#475569', mb: 1 }}>
              Color del proyecto
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.1, flexWrap: 'wrap' }}>
              {COLORS.map((color) => (
                <Box
                  key={color}
                  component="button"
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    setValue('color', color, { shouldDirty: true });
                  }}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: color,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    boxShadow:
                      selectedColor === color ? `0 0 0 3px #fff, 0 0 0 5px ${color}` : 'none',
                  }}
                  aria-label={`Color ${color}`}
                >
                  {selectedColor === color && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : project ? (
              'Guardar cambios'
            ) : (
              'Crear proyecto'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
