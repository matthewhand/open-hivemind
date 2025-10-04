import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { LoadingSpinner } from '../components/DaisyUI/Loading';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import AdminPage from '../pages/Admin';
import BotManagementPage from '../pages/Admin/BotManagementPage';
import UberLayout from '../layouts/UberLayout';
import LoadingPage from '../pages/LoadingPage';

const Login = lazy(() => import('../components/Login'));

// Standalone pages
const StandaloneActivity = lazy(() => import('../pages/StandaloneActivity'));

// Uber pages
const OverviewPage = lazy(() => import('../pages/OverviewPage'));
const BotsPage = lazy(() => import('../pages/BotsPage'));
const BotCreatePage = lazy(() => import('../pages/BotCreatePage'));
const BotTemplatesPage = lazy(() => import('../pages/BotTemplatesPage'));
const PersonasPage = lazy(() => import('../pages/PersonasPage'));
const MCPServerManager = lazy(() => import('../components/MCPServerManager'));
const MCPServersPage = lazy(() => import('../pages/MCPServersPage'));
const MCPToolsPage = lazy(() => import('../pages/MCPToolsPage'));
const GuardsPage = lazy(() => import('../pages/GuardsPage'));
const MonitoringPage = lazy(() => import('../pages/MonitoringPage'));
const ActivityPage = lazy(() => import('../pages/ActivityPage'));
const ExportPage = lazy(() => import('../pages/ExportPage'));
const SystemSettings = lazy(() => import('../pages/SystemSettings'));
const BotConfigurationPage = lazy(() => import('../pages/BotConfigurationPage'));
const StaticPagesPage = lazy(() => import('../pages/StaticPagesPage'));
const SitemapPage = lazy(() => import('../pages/SitemapPage'));
const DaisyUIShowcase = lazy(() => import('../pages/DaisyUIShowcase'));

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
    <LoadingSpinner size="lg" />
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
          <Route path="/" element={<LoadingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/activity" element={<StandaloneActivity />} />
          <Route path="/login" element={<Login />} />

          {/* Admin routes (unified interface) */}
          <Route path="/admin" element={<UberLayout />}>
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />

            {/* Bot Management Routes */}
            <Route path="bots" element={<BotsPage />} />
            <Route path="bots/create" element={<BotCreatePage />} />
            <Route path="bots/templates" element={<BotTemplatesPage />} />

            <Route path="personas" element={<PersonasPage />} />

            {/* MCP Routes */}
            <Route
              path="mcp"
              element={
                <ProtectedRoute>
                  <MCPServerManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="mcp/servers"
              element={
                <ProtectedRoute>
                  <MCPServersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mcp/tools"
              element={
                <ProtectedRoute>
                  <MCPToolsPage />
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

            {/* Monitoring Routes */}
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="activity" element={<ActivityPage />} />

            <Route path="export" element={<ExportPage />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route
              path="configuration"
              element={
                <ProtectedRoute>
                  <BotConfigurationPage />
                </ProtectedRoute>
              }
            />
            <Route path="static" element={<StaticPagesPage />} />
            <Route path="sitemap" element={<SitemapPage />} />
            <Route path="showcase" element={<DaisyUIShowcase />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default AppRouter;
