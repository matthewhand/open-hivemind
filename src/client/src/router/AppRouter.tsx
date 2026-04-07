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
const BotsManagementPage = lazy(() => import('../pages/BotsManagementPage'));
const BotCreatePage = lazy(() => import('../pages/BotCreatePage'));
const BotTemplatesPage = lazy(() => import('../pages/BotTemplatesPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const MCPServerManager = lazy(() => import('../components/MCPServerManager'));
const MCPServersPage = lazy(() => import('../pages/MCPServersPage'));
const MCPToolsPage = lazy(() => import('../pages/MCPToolsPage'));
const ActivityManagementPage = lazy(() => import('../pages/ActivityManagementPage'));
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
const MarketplacePage = lazy(() => import('../pages/MarketplacePage'));
const ProvidersManagementPage = lazy(() => import('../pages/ProvidersManagementPage'));
const SpecsPage = lazy(() => import('../pages/SpecsPage'));
const SpecDetailPage = lazy(() => import('../pages/SpecDetailPage'));
const AuditPage = lazy(() => import('../pages/AuditPage'));
const DeveloperPage = lazy(() => import('../pages/DeveloperPage'));


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
          <Route path="bots" element={<BotsManagementPage />} />
          <Route path="bots/create" element={<BotCreatePage />} />
          <Route path="bots/templates" element={<BotTemplatesPage />} />
          <Route path="chat" element={<ChatPage />} />

          {/* Integrations Routes */}
          <Route path="integrations" element={<Navigate to="/admin/integrations/llm" replace />} />
          <Route path="integrations/:type" element={<IntegrationsPage />} />

          {/* Providers Routes */}
          <Route path="providers" element={<ProvidersManagementPage />} />
          {/* Redirects from old per-type routes to tabbed page */}
          <Route path="providers/llm" element={<Navigate to="/admin/providers" replace />} />
          <Route path="providers/message" element={<Navigate to="/admin/providers?tab=message" replace />} />
          <Route path="providers/memory" element={<Navigate to="/admin/providers?tab=memory" replace />} />
          <Route path="providers/tool" element={<Navigate to="/admin/providers?tab=tool" replace />} />

          {/* Community Route (formerly Marketplace) */}
          <Route path="community" element={<MarketplacePage />} />
          <Route path="marketplace" element={<Navigate to="/admin/community" replace />} />

          <Route path="personas" element={<Navigate to="/admin/bots?tab=personas" replace />} />

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

          <Route path="guards" element={<Navigate to="/admin/bots?tab=guards" replace />} />

          {/* Activity & Monitoring (tabbed) */}
          <Route path="activity" element={<ActivityManagementPage />} />
          {/* Redirects from old standalone routes */}
          <Route path="monitoring" element={<Navigate to="/admin/activity?tab=monitoring" replace />} />
          <Route path="monitoring-dashboard" element={<Navigate to="/admin/activity?tab=monitoring-dashboard" replace />} />
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
          {/* Developer Tools (tabbed page) */}
          <Route path="developer" element={<DeveloperPage />} />
          <Route path="specs/:id" element={<SpecDetailPage />} />

          {/* Backwards-compat redirects for old developer routes */}
          <Route path="static" element={<Navigate to="/admin/developer?tab=static-pages" replace />} />
          <Route path="sitemap" element={<Navigate to="/admin/developer?tab=sitemap" replace />} />
          <Route path="showcase" element={<Navigate to="/admin/developer?tab=showcase" replace />} />
          <Route path="specs" element={<Navigate to="/admin/developer?tab=specs" replace />} />

          <Route path="audit" element={<AuditPage />} />


        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
