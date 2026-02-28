/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { LoadingSpinner } from '../components/DaisyUI/Loading';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import UberLayout from '../layouts/UberLayout';
import LoadingPage from '../pages/LoadingPage';

const Login = lazy(() => import('../components/Login'));
import { useAuth } from '../contexts/AuthContext';

// Standalone pages
const StandaloneActivity = lazy(() => import('../pages/StandaloneActivity'));

// Uber pages
const OverviewPage = lazy(() => import('../pages/OverviewPage'));
const BotsPage = lazy(() => import('../pages/BotsPage'));
const BotCreatePage = lazy(() => import('../pages/BotCreatePage'));
const BotTemplatesPage = lazy(() => import('../pages/BotTemplatesPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const PersonasPage = lazy(() => import('../pages/PersonasPage'));
const MCPServerManager = lazy(() => import('../components/MCPServerManager'));
const MCPServersPage = lazy(() => import('../pages/MCPServersPage'));
const MCPToolsPage = lazy(() => import('../pages/MCPToolsPage'));
const GuardsPage = lazy(() => import('../pages/GuardsPage'));
const MonitoringPage = lazy(() => import('../pages/MonitoringPage'));
const ActivityPage = lazy(() => import('../pages/ActivityPage'));

// Monitoring Dashboard pages
const MonitoringDashboard = lazy(() => import('../pages/MonitoringDashboard'));
const AnalyticsDashboard = lazy(() => import('../pages/AnalyticsDashboard'));
const SystemManagement = lazy(() => import('../pages/SystemManagement'));
const ExportPage = lazy(() => import('../pages/ExportPage'));
const SystemSettings = lazy(() => import('../pages/SystemSettings'));
const BotConfigurationPage = lazy(() => import('../pages/BotConfigurationPage'));
const ConfigPage = lazy(() => import('../pages/ConfigPage'));
const StaticPagesPage = lazy(() => import('../pages/StaticPagesPage'));
const SitemapPage = lazy(() => import('../pages/SitemapPage'));
const DaisyUIShowcase = lazy(() => import('../pages/DaisyUIShowcase'));
const IntegrationsPage = lazy(() => import('../pages/IntegrationsPage'));
const ProvidersPage = lazy(() => import('../pages/ProvidersPage'));
const MessageProvidersPage = lazy(() => import('../pages/MessageProvidersPage'));
const LLMProvidersPage = lazy(() => import('../pages/LLMProvidersPage'));
const SpecsPage = lazy(() => import('../pages/SpecsPage'));
const SpecDetailPage = lazy(() => import('../pages/SpecDetailPage'));

interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
    <LoadingSpinner size="lg" />
    <span className="text-base-content/70">
      {message}
    </span>
  </div>
);

// ProtectedRoute enforces authentication
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback message="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback message="Loading page..." />}>
      <Routes>
        <Route path="/" element={<LoadingPage />} />
        <Route path="/login" element={<Login />} />

        {/* User Dashboard Routes - Wrapped in MainLayout */}
        <Route element={
          <ProtectedRoute>
            <MainLayout>
              <Outlet />
            </MainLayout>
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/activity" element={<StandaloneActivity />} />
        </Route>

        {/* Admin routes (unified interface) - UberLayout handles its own navigation */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <UberLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />


          {/* Bot Management Routes */}
          <Route path="bots" element={<BotsPage />} />
          <Route path="bots/create" element={<BotCreatePage />} />
          <Route path="bots/templates" element={<BotTemplatesPage />} />
          <Route path="chat" element={<ChatPage />} />

          {/* Integrations Routes */}
          <Route path="integrations" element={<Navigate to="/admin/integrations/llm" replace />} />
          <Route path="integrations/:type" element={<IntegrationsPage />} />

          {/* Providers Routes */}
          <Route path="providers" element={<ProvidersPage />} />
          <Route path="providers/message" element={<MessageProvidersPage />} />
          <Route path="providers/llm" element={<LLMProvidersPage />} />

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

          {/* New Monitoring Dashboard Routes */}
          <Route path="monitoring-dashboard" element={<MonitoringDashboard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="system-management" element={<SystemManagement />} />

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
          <Route
            path="config"
            element={
              <ProtectedRoute>
                <ConfigPage />
              </ProtectedRoute>
            }
          />
          <Route path="static" element={<StaticPagesPage />} />
          <Route path="sitemap" element={<SitemapPage />} />
          <Route path="showcase" element={<DaisyUIShowcase />} />
          <Route path="specs" element={<SpecsPage />} />
          <Route path="specs/:id" element={<SpecDetailPage />} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
