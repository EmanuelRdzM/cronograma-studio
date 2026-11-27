import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { LogoMark } from '@/components/Logo';

export function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#F5F7FB', px: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <LogoMark size={48} />
        </Box>
        <Typography sx={{ fontSize: 44, fontWeight: 780, letterSpacing: '-0.04em', color: '#0F172A', lineHeight: 1 }}>404</Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 680, color: '#334155', mt: 1 }}>Esta página no existe</Typography>
        <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.6 }}>
          Puede que el enlace esté mal escrito o que la página se haya movido.
        </Typography>
        <Button component={Link} to="/" variant="contained" startIcon={<ArrowBackRoundedIcon />} sx={{ mt: 2.5 }}>
          Volver al panel
        </Button>
      </Box>
    </Box>
  );
}
