/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { SkeletonPage } from '../components/DaisyUI/Skeleton';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import UberLayout from '../layouts/UberLayout';
import LoadingPage from '../pages/LoadingPage';
import { RouteErrorBoundary } from '../components/ErrorBoundary';

const Login = lazy(() => import('../components/Login'));
import { useAuth } from '../contexts/AuthContext';

// Standalone pages
const StandaloneActivity = lazy(() => import('../pages/StandaloneActivity'));

// Uber pages
const OverviewPage = lazy(() => import('../pages/OverviewPage'));
const BotsPage = lazy(() => import('../pages/BotsPage'));
const PersonasPage = lazy(() => import('../pages/PersonasPage'));
const GuardsPage = lazy(() => import('../pages/GuardsPage'));
const BotCreatePage = lazy(() => import('../pages/BotCreatePage'));
const BotTemplatesPage = lazy(() => import('../pages/BotTemplatesPage'));
const MCPServerManager = lazy(() => import('../components/MCPServerManager'));
const MCPServersPage = lazy(() => import('../pages/MCPServersPage'));
const MCPToolsPage = lazy(() => import('../pages/MCPToolsPage'));
const ActivityPage = lazy(() => import('../pages/ActivityPage'));
const DeveloperPage = lazy(() => import('../pages/DeveloperPage'));

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
const ResponseProfilesPage = lazy(() => import('../pages/ResponseProfilesPage'));
const SpecsPage = lazy(() => import('../pages/SpecsPage'));
const SpecDetailPage = lazy(() => import('../pages/SpecDetailPage'));
const AuditPage = lazy(() => import('../pages/AuditPage'));
const AdminHealthPage = lazy(() => import('../pages/AdminHealthPage'));
const WebhookEventsPage = lazy(() => import('../pages/WebhookEventsPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ApiDocsPage = lazy(() => import('../pages/ApiDocsPage'));
const HelpPage = lazy(() => import('../pages/HelpPage'));


interface LoadingFallbackProps {
  message?: string;
}

const TipRotator = lazy(() => import('../components/TipRotator'));

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message: _message = 'Loading...' }) => (
  <div className="min-h-[60vh] p-6">
    <Suspense fallback={null}>
      <TipRotator className="mb-4 px-2" />
    </Suspense>
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

        {/* Admin routes - UberLayout handles its own navigation */}
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

          {/* Each provider type gets its own top-level page with tabs */}
          <Route path="llm" element={<RouteErrorBoundary pageName="LLM"><LLMProvidersPage /></RouteErrorBoundary>} />
          <Route path="message" element={<RouteErrorBoundary pageName="Message"><MessageProvidersPage /></RouteErrorBoundary>} />
          <Route path="memory" element={<RouteErrorBoundary pageName="Memory"><MemoryProvidersPage /></RouteErrorBoundary>} />
          <Route path="tool" element={<RouteErrorBoundary pageName="Tool"><ToolProvidersPage /></RouteErrorBoundary>} />
          <Route path="config/response-profiles" element={<RouteErrorBoundary pageName="Response Profiles"><ResponseProfilesPage /></RouteErrorBoundary>} />

          {/* Personas and Guards are standalone pages */}
          <Route path="personas" element={<RouteErrorBoundary pageName="Personas"><PersonasPage /></RouteErrorBoundary>} />
          <Route path="guards" element={<RouteErrorBoundary pageName="Guards"><GuardsPage /></RouteErrorBoundary>} />

          {/* Legacy redirects */}
          <Route path="providers" element={<Navigate to="/admin/llm" replace />} />
          <Route path="providers/llm" element={<Navigate to="/admin/llm" replace />} />
          <Route path="providers/message" element={<Navigate to="/admin/message" replace />} />
          <Route path="providers/memory" element={<Navigate to="/admin/memory" replace />} />
          <Route path="providers/tool" element={<Navigate to="/admin/tool" replace />} />
          <Route path="integrations" element={<Navigate to="/admin/llm" replace />} />
          <Route path="integrations/:type" element={<RouteErrorBoundary pageName="Integrations"><IntegrationsPage /></RouteErrorBoundary>} />

          {/* Marketplace Route */}
          <Route path="marketplace" element={<RouteErrorBoundary pageName="Marketplace"><MarketplacePage /></RouteErrorBoundary>} />

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

          {/* guards is now a standalone route above */}

          {/* Activity & Monitoring — now consolidated into Overview tabs */}
          <Route path="activity" element={<Navigate to="/admin/overview?tab=activity" replace />} />
          <Route path="monitoring" element={<Navigate to="/admin/overview?tab=monitoring" replace />} />
          <Route path="monitoring-dashboard" element={<Navigate to="/admin/overview?tab=monitoring" replace />} />
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
          {/* Developer — tabbed page (Specs, Sitemap, UI Components, Static Pages) */}
          <Route path="developer" element={<RouteErrorBoundary pageName="Developer"><DeveloperPage /></RouteErrorBoundary>} />
          <Route path="static" element={<Navigate to="/admin/developer?tab=static-pages" replace />} />
          <Route path="sitemap" element={<Navigate to="/admin/developer?tab=sitemap" replace />} />
          <Route path="showcase" element={<Navigate to="/admin/developer?tab=showcase" replace />} />
          <Route path="specs" element={<Navigate to="/admin/developer?tab=specs" replace />} />
          <Route path="specs/:id" element={<RouteErrorBoundary pageName="Spec Detail"><SpecDetailPage /></RouteErrorBoundary>} />
          <Route path="audit" element={<RouteErrorBoundary pageName="Audit"><AuditPage /></RouteErrorBoundary>} />
          <Route path="health" element={<RouteErrorBoundary pageName="Health"><AdminHealthPage /></RouteErrorBoundary>} />

          <Route path="webhooks" element={<RouteErrorBoundary pageName="Webhook Events"><WebhookEventsPage /></RouteErrorBoundary>} />
          <Route path="api-docs" element={<RouteErrorBoundary pageName="API Docs"><ApiDocsPage /></RouteErrorBoundary>} />
          <Route path="help" element={<RouteErrorBoundary pageName="Help"><HelpPage /></RouteErrorBoundary>} />
          <Route path="about" element={<RouteErrorBoundary pageName="About"><AboutPage /></RouteErrorBoundary>} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
