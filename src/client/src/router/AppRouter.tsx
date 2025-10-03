import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import AdminPage from '../pages/Admin';
import BotManagementPage from '../pages/Admin/BotManagementPage';
import UberLayout from '../layouts/UberLayout';

const Login = lazy(() => import('../components/Login'));

// Uber pages
const OverviewPage = lazy(() => import('../pages/OverviewPage'));
const BotsPage = lazy(() => import('../pages/BotsPage'));
const PersonasPage = lazy(() => import('../pages/PersonasPage'));
const MCPServerManager = lazy(() => import('../components/MCPServerManager'));
const GuardsPage = lazy(() => import('../pages/GuardsPage'));
const MonitoringPage = lazy(() => import('../pages/MonitoringPage'));
const ExportPage = lazy(() => import('../pages/ExportPage'));

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Loading...' }) => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="60vh"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={48} />
    <Box component="span" sx={{ color: 'text.secondary' }}>
      {message}
    </Box>
  </Box>
);

// Simplified ProtectedRoute that always allows access (for localhost development)
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // For localhost development, always allow access
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/uber" replace />} />
          <Route path="/webui" element={<DashboardPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        <Route
            path="/admin/bots"
            element={
              <ProtectedRoute>
                <BotManagementPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />

          {/* Uber routes */}
          <Route path="/uber" element={<UberLayout />}>
            <Route index element={<Navigate to="/uber/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="bots" element={<BotsPage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route
              path="mcp"
              element={
                <ProtectedRoute>
                  <MCPServerManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="guards"
              element={
                <ProtectedRoute>
                  <GuardsPage />
                </ProtectedRoute>
              }
            />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="export" element={<ExportPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default AppRouter;
