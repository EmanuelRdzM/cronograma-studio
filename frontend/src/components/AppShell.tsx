import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import PasswordRoundedIcon from '@mui/icons-material/PasswordRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { Logo } from './Logo';
import { useAuth } from '@/auth/AuthContext';
import { initials } from '@/lib/labels';
import { ChangePasswordDialog } from './ChangePasswordDialog';

const FULL_WIDTH = 248;
const RAIL_WIDTH = 76;

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Proyectos',
    to: '/',
    icon: <FolderRoundedIcon fontSize="small" />,
    match: (pathname) => pathname === '/' || pathname.startsWith('/projects'),
  },
  {
    label: 'Importar PlantUML',
    to: '/import',
    icon: <PublishRoundedIcon fontSize="small" />,
    match: (pathname) => pathname.startsWith('/import'),
  },
];

function SidebarContent({
  collapsed,
  onNavigate,
  onLogoClick,
  logoActionLabel,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onLogoClick: () => void;
  logoActionLabel: string;
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const go = (to: string) => {
    navigate(to);
    onNavigate?.();
  };

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: 76,
          px: collapsed ? 1.2 : 1.8,
          flexShrink: 0,
        }}
      >
        <Tooltip title={logoActionLabel} placement={collapsed ? 'right' : 'bottom'}>
          <ButtonBase
            onClick={onLogoClick}
            aria-label={logoActionLabel}
            sx={{
              width: '100%',
              minWidth: 0,
              p: 0.6,
              borderRadius: 2,
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&:hover': { backgroundColor: 'rgba(148,163,184,.10)' },
            }}
          >
            <Logo collapsed={collapsed} light />
          </ButtonBase>
        </Tooltip>
      </Box>

      <Box sx={{ px: collapsed ? 1.2 : 1.6, mt: collapsed ? 0 : 1 }}>
        {!collapsed && (
          <Typography
            sx={{
              px: 1.4,
              pb: 1,
              fontSize: 9.5,
              letterSpacing: '.16em',
              fontWeight: 700,
              color: 'rgba(148,163,184,.5)',
              textTransform: 'uppercase',
            }}
          >
            Espacio de trabajo
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const active = item.match(location.pathname);
            const button = (
              <ButtonBase
                key={item.to}
                onClick={() => go(item.to)}
                sx={{
                  width: '100%',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 1.4,
                  px: collapsed ? 0 : 1.4,
                  py: 1.05,
                  borderRadius: 2,
                  color: active ? '#FFFFFF' : 'rgba(203,213,225,.72)',
                  background: active ? 'linear-gradient(90deg, rgba(99,102,241,.28), rgba(99,102,241,.08))' : 'transparent',
                  border: active ? '1px solid rgba(129,140,248,.25)' : '1px solid transparent',
                  position: 'relative',
                  '&:hover': {
                    color: '#FFFFFF',
                    backgroundColor: active ? undefined : 'rgba(148,163,184,.09)',
                  },
                  '&::before': active
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: collapsed ? 4 : -4,
                        top: '25%',
                        height: '50%',
                        width: 3,
                        borderRadius: 3,
                        backgroundColor: '#818CF8',
                      }
                    : undefined,
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: 1.7,
                    backgroundColor: active ? 'rgba(129,140,248,.18)' : 'rgba(148,163,184,.07)',
                    color: active ? '#C7D2FE' : 'rgba(203,213,225,.65)',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                {!collapsed && (
                  <Typography sx={{ fontSize: 13, fontWeight: active ? 650 : 550, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </Typography>
                )}
              </ButtonBase>
            );
            return collapsed ? (
              <Tooltip key={item.to} title={item.label} placement="right">
                {button}
              </Tooltip>
            ) : (
              button
            );
          })}
        </Box>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ p: collapsed ? 1 : 1.6 }}>
        {!collapsed && (
          <Box
            sx={{
              mb: 1.4,
              p: 1.5,
              borderRadius: 2.5,
              border: '1px solid rgba(148,163,184,.13)',
              backgroundColor: 'rgba(148,163,184,.05)',
            }}
          >
            <Typography sx={{ fontSize: 11.5, fontWeight: 650, color: 'rgba(226,232,240,.78)', mb: 0.4 }}>
              Comparte el avance
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'rgba(148,163,184,.65)', lineHeight: 1.5 }}>
              Un enlace de solo lectura muestra siempre la última versión.
            </Typography>
          </Box>
        )}
        <Divider sx={{ borderColor: 'rgba(148,163,184,.12)', mb: 1.2 }} />
        <Box
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            px: collapsed ? 0 : 1,
            py: 0.8,
            borderRadius: 2,
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            '&:hover': { backgroundColor: 'rgba(148,163,184,.08)' },
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 12,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #818CF8, #4F46E5)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.15)',
            }}
          >
            {initials(user?.name ?? '?')}
          </Avatar>
          {!collapsed && (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 650, color: '#E2E8F0', lineHeight: 1.2 }} noWrap>
                  {user?.name}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'rgba(148,163,184,.7)', lineHeight: 1.3 }} noWrap>
                  {user?.email}
                </Typography>
              </Box>
              <MoreHorizRoundedIcon sx={{ fontSize: 18, color: 'rgba(148,163,184,.65)' }} />
            </>
          )}
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setPasswordOpen(true);
          }}
        >
          <ListItemIcon>
            <PasswordRoundedIcon fontSize="small" />
          </ListItemIcon>
          Cambiar contraseña
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            logout();
          }}
        >
          <ListItemIcon>
            <LogoutRoundedIcon fontSize="small" />
          </ListItemIcon>
          Cerrar sesión
        </MenuItem>
      </Menu>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cronograma.sidebar') === 'rail');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cronograma.sidebar', collapsed ? 'rail' : 'full');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (isMobile) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          sx={{
            height: 56,
            flexShrink: 0,
            px: 1.4,
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#fff',
          }}
        >
          <IconButton size="small" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
            <MenuRoundedIcon />
          </IconButton>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Logo />
          </Box>
          <Box sx={{ width: 32 }} />
        </Box>
        <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          slotProps={{ paper: { sx: { width: FULL_WIDTH, backgroundColor: '#0B1220', border: 'none' } } }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <SidebarContent
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              onLogoClick={() => setMobileOpen(false)}
              logoActionLabel="Cerrar menú"
            />
          </Box>
        </Drawer>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Box
        component="aside"
        sx={{
          width: collapsed ? RAIL_WIDTH : FULL_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B1220',
          backgroundImage:
            'radial-gradient(circle at 15% 0%, rgba(79,70,229,.18), transparent 38%), radial-gradient(circle at 100% 100%, rgba(14,116,144,.12), transparent 40%)',
          borderRight: '1px solid rgba(148,163,184,.08)',
          transition: 'width 180ms ease',
          overflow: 'hidden',
        }}
      >
        <SidebarContent
          collapsed={collapsed}
          onLogoClick={() => setCollapsed((value) => !value)}
          logoActionLabel={collapsed ? 'Expandir menú' : 'Contraer menú'}
        />
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
