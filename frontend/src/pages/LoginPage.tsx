import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import { Logo, LogoMark } from '@/components/Logo';
import { useAuth } from '@/auth/AuthContext';
import { ApiError } from '@/api/client';

function MiniGantt() {
  const months = ['oct', 'nov', 'dic', 'ene'];
  const rows = [
    { label: 'Descubrimiento', start: 8, width: 76, color: '#818CF8', progress: 100 },
    { label: 'Diseño', start: 58, width: 112, color: '#34D399', progress: 100 },
    { label: 'Desarrollo', start: 148, width: 96, color: '#FBBF24', progress: 45 },
    { label: 'Calidad', start: 222, width: 116, color: '#22D3EE', progress: 20 },
    { label: 'Lanzamiento', start: 304, width: 88, color: '#F472B6', progress: 0 },
  ];
  return (
    <Box
      sx={{
        mt: 5,
        p: 2.2,
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,.18)',
        backgroundColor: 'rgba(15,23,42,.45)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 30px 80px rgba(0,0,0,.28)',
        maxWidth: 520,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonthRoundedIcon sx={{ fontSize: 15, color: '#A5B4FC' }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#E2E8F0' }}>
            Lanzamiento del nuevo sitio web
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34D399' }} />
          <Typography sx={{ fontSize: 9.5, color: 'rgba(203,213,225,.6)' }}>En vivo</Typography>
        </Box>
      </Box>
      <Box sx={{ position: 'relative', ml: '92px' }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(148,163,184,.12)', pb: 0.8, mb: 0.8 }}>
          {months.map((month) => (
            <Typography key={month} sx={{ flex: 1, fontSize: 8.5, color: 'rgba(203,213,225,.45)', textTransform: 'capitalize' }}>
              {month}
            </Typography>
          ))}
        </Box>
        {rows.map((row) => (
          <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', height: 26 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, position: 'absolute', left: -92, width: 84 }}>
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: row.color }} />
              <Typography sx={{ fontSize: 8.5, color: 'rgba(203,213,225,.62)' }} noWrap>
                {row.label}
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', width: '100%', height: 8, backgroundColor: 'rgba(148,163,184,.06)', borderRadius: 1 }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: `${(row.start / 400) * 100}%`,
                  width: `${(row.width / 400) * 100}%`,
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: `${row.color}33`,
                  border: `1px solid ${row.color}55`,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ width: `${row.progress}%`, height: '100%', backgroundColor: row.color, opacity: 0.9 }} />
              </Box>
            </Box>
          </Box>
        ))}
        <Box
          sx={{
            position: 'absolute',
            left: '42%',
            top: -12,
            bottom: -4,
            width: 1.5,
            backgroundColor: '#FBBF24',
            boxShadow: '0 0 10px rgba(251,191,36,.55)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -4,
              left: -2.2,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#FBBF24',
            },
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.6, pt: 1.3, borderTop: '1px solid rgba(148,163,184,.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 8, height: 3, borderRadius: 2, backgroundColor: '#34D399' }} />
          <Typography sx={{ fontSize: 8.5, color: 'rgba(203,213,225,.5)' }}>Completada</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 8, height: 3, borderRadius: 2, backgroundColor: '#FBBF24' }} />
          <Typography sx={{ fontSize: 8.5, color: 'rgba(203,213,225,.5)' }}>En progreso</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <Box sx={{ width: 1.5, height: 8, backgroundColor: '#FBBF24' }} />
          <Typography sx={{ fontSize: 8.5, color: 'rgba(203,213,225,.5)' }}>Hoy</Typography>
        </Box>
        <Typography sx={{ ml: 'auto', fontSize: 8.5, color: 'rgba(203,213,225,.4)' }}>12 actividades</Typography>
      </Box>
    </Box>
  );
}

const FEATURES = [
  {
    icon: <EditCalendarRoundedIcon fontSize="small" />,
    title: 'Edición visual',
    text: 'Arrastra, estira y ajusta sin tocar código.',
  },
  {
    icon: <CalendarMonthRoundedIcon fontSize="small" />,
    title: 'Día, semana y mes',
    text: 'La misma información, tres niveles de detalle.',
  },
  {
    icon: <ShareRoundedIcon fontSize="small" />,
    title: 'Comparte el avance',
    text: 'Solo lectura, revocable y siempre actualizado.',
  },
];

export function LoginPage() {
  const { token, checking, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@local' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'admin123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (checking) {
    return (
      <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center', bgcolor: '#0B1220' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <LogoMark size={48} />
          <CircularProgress size={22} sx={{ color: '#818CF8' }} />
        </Box>
      </Box>
    );
  }
  if (token) {
    const target = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={target} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: '#fff' }}>
      <Box
        sx={{
          flex: '1 1 56%',
          minWidth: 0,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          p: { md: 5, lg: 7 },
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0B1220',
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(79,70,229,.32), transparent 40%), radial-gradient(circle at 90% 80%, rgba(14,116,144,.20), transparent 45%)',
          color: '#fff',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(148,163,184,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.04) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
            maskImage: 'radial-gradient(circle at 50% 30%, black, transparent 78%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 620, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Logo light />
          <Box sx={{ mt: { md: 8, lg: 10 } }}>
            <Typography
              component="div"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.4,
                py: 0.7,
                borderRadius: 999,
                border: '1px solid rgba(129,140,248,.22)',
                backgroundColor: 'rgba(99,102,241,.10)',
                color: '#C7D2FE',
                fontSize: 10.5,
                fontWeight: 650,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                mb: 3,
              }}
            >
              <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#818CF8' }} />
              Planificación visual de proyectos
            </Typography>
            <Typography component="h1" sx={{ fontSize: { md: 44, lg: 52 }, fontWeight: 780, letterSpacing: '-0.045em', lineHeight: 1.06, maxWidth: 560 }}>
              Tus cronogramas,
              <br />
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(90deg, #C7D2FE, #818CF8 55%, #67E8F9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                sin escribir código.
              </Box>
            </Typography>
            <Typography sx={{ mt: 2.5, fontSize: 15, lineHeight: 1.7, color: 'rgba(203,213,225,.72)', maxWidth: 480 }}>
              Crea actividades, mueve fechas y comparte el avance desde una sola vista.
              El diagrama se actualiza mientras trabajas.
            </Typography>
            <MiniGantt />
          </Box>
          <Box sx={{ mt: 'auto', pt: 5, display: 'flex', gap: { md: 3, lg: 4 }, flexWrap: 'wrap' }}>
            {FEATURES.map((feature) => (
              <Box key={feature.title} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, maxWidth: 170 }}>
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: 1.7,
                    backgroundColor: 'rgba(99,102,241,.14)',
                    border: '1px solid rgba(129,140,248,.18)',
                    color: '#C7D2FE',
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#E2E8F0' }}>{feature.title}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(148,163,184,.68)', lineHeight: 1.5, mt: 0.3 }}>
                    {feature.text}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          flex: '1 1 44%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6 },
          py: 5,
          backgroundColor: '#FBFCFE',
          position: 'relative',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 382 }}>
          <Box sx={{ display: { md: 'none' }, mb: 4 }}>
            <LogoMark size={44} />
          </Box>
          <Typography component="h2" sx={{ fontSize: 28, fontWeight: 760, letterSpacing: '-0.035em', color: '#0F172A' }}>
            Bienvenido de nuevo
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#64748B', mt: 1, mb: 4 }}>
            Entra para administrar tus proyectos y cronogramas.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: 12.5 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#475569', mb: 0.8 }}>
                Correo electrónico
              </Typography>
              <TextField
                fullWidth
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                autoComplete="username"
                inputProps={{ 'aria-label': 'Correo electrónico' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: '#475569', mb: 0.8 }}>
                Contraseña
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                inputProps={{ 'aria-label': 'Contraseña' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword((value) => !value)} edge="end">
                        {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !email.trim() || !password}
              endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardRoundedIcon />}
              sx={{ mt: 1, minHeight: 44, fontSize: 13.5 }}
            >
              Entrar al panel
            </Button>
          </Box>

          {import.meta.env.DEV && (
            <Box
              sx={{
                mt: 3,
                p: 1.6,
                borderRadius: 2,
                border: '1px dashed #D7DEEA',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 15, color: '#10B981', mt: 0.15 }} />
              <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.55 }}>
                Acceso inicial de desarrollo: <b>admin@local</b> / <b>admin123</b>
                <br />
                Cámbialo desde el menú de usuario.
              </Typography>
            </Box>
          )}

          <Typography sx={{ mt: 5, fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
            Cronograma Studio · Planeación visual de proyectos
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
