import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Container } from '../components/DaisyUI';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import { useAuth } from '../contexts/AuthContext';

import MainLayout from '../layouts/MainLayout';
import AdminPage from '../pages/Admin';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminLayout from '../components/Admin/AdminLayout';
import AgentManagementPage from '../pages/AgentManagementPage';

const Login = lazy(() => import('../components/Login'));
const HomePage = lazy(() => import('../pages/HomePage'));
const LandingPage = lazy(() => import('../pages/LandingPage'));

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
const ComponentShowcasePage = lazy(() => import('../pages/ComponentShowcasePage'));

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
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/monitor" element={<MonitoringPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Outlet />
                </AdminLayout>
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminPage />} />
            <Route path="agents" element={<AgentManagementPage />} />
            <Route path="personas" element={<div>Persona Management Page - Coming Soon</div>} />
            <Route path="mcp-servers" element={<div>MCP Servers Page - Coming Soon</div>} />
          </Route>
          <Route path="/login" element={<Login />} />

          {/* Dashboard routes (renamed from uber) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
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
            <Route path="components" element={<ComponentShowcasePage />} />
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
