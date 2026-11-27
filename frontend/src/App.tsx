import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { LogoMark } from './components/Logo';
import { LoginPage } from './pages/LoginPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectPage } from './pages/ProjectPage';
import { ImportPage } from './pages/ImportPage';
import { PublicSharePage } from './pages/PublicSharePage';
import { SnapshotPage } from './pages/SnapshotPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Splash() {
  return (
    <Box sx={{ height: '100vh', display: 'grid', placeItems: 'center', backgroundColor: '#0B1220' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <LogoMark size={48} />
        <CircularProgress size={20} sx={{ color: '#818CF8' }} />
      </Box>
    </Box>
  );
}

function ProtectedLayout() {
  const { token, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Splash />;
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/projects/:projectId/versions/:snapshotId" element={<SnapshotPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
