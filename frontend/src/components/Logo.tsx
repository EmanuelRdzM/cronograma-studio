import { useId } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function LogoMark({ size = 36 }: { size?: number }) {
  const gradientId = `logo-bg-${useId().replace(/:/g, '')}`;
  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#${gradientId})`} />
      <rect x="1" y="1" width="46" height="46" rx="13" fill="none" stroke="rgba(255,255,255,.18)" />
      <rect x="10" y="13" width="17" height="5" rx="2.5" fill="#FFFFFF" opacity=".95" />
      <rect x="10" y="22" width="27" height="5" rx="2.5" fill="#FFFFFF" opacity=".75" />
      <rect x="10" y="31" width="21" height="5" rx="2.5" fill="#FFFFFF" opacity=".55" />
      <rect x="30.5" y="8" width="2.5" height="31" rx="1.25" fill="#FBBF24" />
    </Box>
  );
}

export function Logo({ collapsed = false, light = false }: { collapsed?: boolean; light?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, minWidth: 0 }}>
      <LogoMark size={collapsed ? 38 : 36} />
      {!collapsed && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 780,
              fontSize: 15.5,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: light ? '#F8FAFC' : '#0F172A',
              whiteSpace: 'nowrap',
            }}
          >
            Cronograma
            <Box component="span" sx={{ color: light ? '#A5B4FC' : '#4F46E5' }}>
              {' '}Studio
            </Box>
          </Typography>
          <Typography
            sx={{
              fontSize: 9.5,
              letterSpacing: '.13em',
              textTransform: 'uppercase',
              color: light ? 'rgba(226,232,240,.5)' : '#94A3B8',
              fontWeight: 650,
              mt: 0.4,
              whiteSpace: 'nowrap',
            }}
          >
            Gestión de cronogramas
          </Typography>
        </Box>
      )}
    </Box>
  );
}
