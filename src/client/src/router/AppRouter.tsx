/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { SkeletonPage } from '../components/DaisyUI/Skeleton';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import UberLayout from '../layouts/UberLayout';
import LoadingPage from '../pages/LoadingPage';
import RouteErrorBoundary from '../components/RouteErrorBoundary';

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
const MarketplacePage = lazy(() => import('../pages/MarketplacePage'));
const ProvidersPage = lazy(() => import('../pages/ProvidersPage'));
const MessageProvidersPage = lazy(() => import('../pages/MessageProvidersPage'));
const LLMProvidersPage = lazy(() => import('../pages/LLMProvidersPage'));
const MemoryProvidersPage = lazy(() => import('../pages/MemoryProvidersPage'));
const ToolProvidersPage = lazy(() => import('../pages/ToolProvidersPage'));
const SpecsPage = lazy(() => import('../pages/SpecsPage'));
const SpecDetailPage = lazy(() => import('../pages/SpecDetailPage'));
const AuditPage = lazy(() => import('../pages/AuditPage'));
const WebhookEventsPage = lazy(() => import('../pages/WebhookEventsPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));


interface LoadingFallbackProps {
  message?: string;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message: _message = 'Loading...' }) => (
  <div className="min-h-[60vh] p-6">
    <SkeletonPage variant="cards" statsCount={3} />
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
        <Route path="/" element={<RouteErrorBoundary pageName="Loading"><LoadingPage /></RouteErrorBoundary>} />
        <Route path="/login" element={<RouteErrorBoundary pageName="Login"><Login /></RouteErrorBoundary>} />
        <Route path="/onboarding" element={<RouteErrorBoundary pageName="Onboarding"><OnboardingPage /></RouteErrorBoundary>} />

        {/* User Dashboard Routes - Wrapped in MainLayout */}
        <Route element={
          <ProtectedRoute>
            <MainLayout>
              <RouteErrorBoundary pageName="Dashboard Layout">
                <Outlet />
              </RouteErrorBoundary>
            </MainLayout>
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<RouteErrorBoundary pageName="Dashboard"><DashboardPage /></RouteErrorBoundary>} />
          <Route path="/activity" element={<RouteErrorBoundary pageName="Activity"><StandaloneActivity /></RouteErrorBoundary>} />
        </Route>

        {/* Admin routes (unified interface) - UberLayout handles its own navigation */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <UberLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<RouteErrorBoundary pageName="Overview"><OverviewPage /></RouteErrorBoundary>} />


          {/* Bot Management Routes */}
          <Route path="bots" element={<RouteErrorBoundary pageName="Bots"><BotsPage /></RouteErrorBoundary>} />
          <Route path="bots/create" element={<RouteErrorBoundary pageName="Create Bot"><BotCreatePage /></RouteErrorBoundary>} />
          <Route path="bots/templates" element={<RouteErrorBoundary pageName="Bot Templates"><BotTemplatesPage /></RouteErrorBoundary>} />
          <Route path="chat" element={<RouteErrorBoundary pageName="Chat"><ChatPage /></RouteErrorBoundary>} />

          {/* Integrations Routes */}
          <Route path="integrations" element={<Navigate to="/admin/integrations/llm" replace />} />
          <Route path="integrations/:type" element={<RouteErrorBoundary pageName="Integrations"><IntegrationsPage /></RouteErrorBoundary>} />

          {/* Providers Routes */}
          <Route path="providers" element={<RouteErrorBoundary pageName="Providers"><ProvidersPage /></RouteErrorBoundary>} />
          <Route path="providers/message" element={<RouteErrorBoundary pageName="Message Providers"><MessageProvidersPage /></RouteErrorBoundary>} />
          <Route path="providers/llm" element={<RouteErrorBoundary pageName="LLM Providers"><LLMProvidersPage /></RouteErrorBoundary>} />
          <Route path="providers/memory" element={<RouteErrorBoundary pageName="Memory Providers"><MemoryProvidersPage /></RouteErrorBoundary>} />
          <Route path="providers/tool" element={<RouteErrorBoundary pageName="Tool Providers"><ToolProvidersPage /></RouteErrorBoundary>} />

          {/* Marketplace Route */}
          <Route path="marketplace" element={<RouteErrorBoundary pageName="Marketplace"><MarketplacePage /></RouteErrorBoundary>} />

          <Route path="personas" element={<RouteErrorBoundary pageName="Personas"><PersonasPage /></RouteErrorBoundary>} />

          {/* MCP Routes */}
          <Route
            path="mcp"
            element={
              <ProtectedRoute>
                <RouteErrorBoundary pageName="MCP Server Manager">
                  <MCPServerManager />
                </RouteErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="mcp/servers"
            element={
              <ProtectedRoute>
                <RouteErrorBoundary pageName="MCP Servers">
                  <MCPServersPage />
                </RouteErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="mcp/tools"
            element={
              <ProtectedRoute>
                <RouteErrorBoundary pageName="MCP Tools">
                  <MCPToolsPage />
                </RouteErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="guards"
            element={
              <ProtectedRoute>
                <RouteErrorBoundary pageName="Guards">
                  <GuardsPage />
                </RouteErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Monitoring Routes */}
          <Route path="monitoring" element={<RouteErrorBoundary pageName="Monitoring"><MonitoringPage /></RouteErrorBoundary>} />
          <Route path="activity" element={<RouteErrorBoundary pageName="Activity"><ActivityPage /></RouteErrorBoundary>} />

          {/* New Monitoring Dashboard Routes */}
          <Route path="monitoring-dashboard" element={<RouteErrorBoundary pageName="Monitoring Dashboard"><MonitoringDashboard /></RouteErrorBoundary>} />
          <Route path="analytics" element={<RouteErrorBoundary pageName="Analytics"><AnalyticsDashboard /></RouteErrorBoundary>} />
          <Route path="system-management" element={<RouteErrorBoundary pageName="System Management"><SystemManagement /></RouteErrorBoundary>} />

          <Route path="export" element={<RouteErrorBoundary pageName="Export"><ExportPage /></RouteErrorBoundary>} />
          <Route path="settings" element={<RouteErrorBoundary pageName="Settings"><SystemSettings /></RouteErrorBoundary>} />
          <Route
            path="configuration"
            element={
              <ProtectedRoute>
                <RouteErrorBoundary pageName="Bot Configuration">
                  <BotConfigurationPage />
                </RouteErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="config"
            element={
              <ProtectedRoute>
                <RouteErrorBoundary pageName="Config">
                  <ConfigPage />
                </RouteErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="static" element={<RouteErrorBoundary pageName="Static Pages"><StaticPagesPage /></RouteErrorBoundary>} />
          <Route path="sitemap" element={<RouteErrorBoundary pageName="Sitemap"><SitemapPage /></RouteErrorBoundary>} />
          <Route path="showcase" element={<RouteErrorBoundary pageName="DaisyUI Showcase"><DaisyUIShowcase /></RouteErrorBoundary>} />
          <Route path="specs" element={<RouteErrorBoundary pageName="Specs"><SpecsPage /></RouteErrorBoundary>} />
          <Route path="specs/:id" element={<RouteErrorBoundary pageName="Spec Detail"><SpecDetailPage /></RouteErrorBoundary>} />
          <Route path="audit" element={<RouteErrorBoundary pageName="Audit"><AuditPage /></RouteErrorBoundary>} />
          <Route path="webhooks" element={<RouteErrorBoundary pageName="Webhook Events"><WebhookEventsPage /></RouteErrorBoundary>} />


        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
