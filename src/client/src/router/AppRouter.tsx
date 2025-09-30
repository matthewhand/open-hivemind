import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Container } from '../components/DaisyUI';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { useAuth } from '../contexts/AuthContext';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import AdminPage from '../pages/Admin';
import UberLayout from '../layouts/UberLayout';

const Login = lazy(() => import('../components/Login'));

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
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const StaticPagesPage = lazy(() => import('../pages/StaticPagesPage'));
const SitemapPage = lazy(() => import('../pages/SitemapPage'));
const DaisyUIShowcase = lazy(() => import('../pages/DaisyUIShowcase'));

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Loading...' }) => (
  <Container className="flex justify-center items-center min-h-[60vh] flex-col gap-4">
    <LoadingSpinner size="lg" />
    <span className="text-base-content/70">
      {message}
    </span>
  </Container>
);

// Protected route that checks authentication
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback message="Checking authentication..." />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<Navigate to="/loading-enhanced.html" replace />} />
          <Route path="/monitor" element={<MonitoringPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />

          {/* Dashboard routes (renamed from uber) */}
          <Route path="/dashboard" element={<UberLayout />}>
            <Route index element={<Navigate to="/dashboard/overview" replace />} />
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
            
            {/* System Routes */}
            <Route path="activity" element={<ActivityPage />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="static" element={<StaticPagesPage />} />
            <Route path="sitemap" element={<SitemapPage />} />
            <Route path="showcase" element={<DaisyUIShowcase />} />
          </Route>

          {/* Legacy redirects */}
          <Route path="/uber" element={<Navigate to="/dashboard" replace />} />
          <Route path="/uber/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/webui" element={<Navigate to="/monitor" replace />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

export default AppRouter;
