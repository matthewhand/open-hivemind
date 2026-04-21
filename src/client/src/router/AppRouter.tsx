/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { SkeletonPage } from '../components/DaisyUI/Skeleton';

import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/Dashboard';
import UberLayout from '../layouts/UberLayout';
import LoadingPage from '../pages/LoadingPage';
import ErrorBoundary from '../components/ErrorBoundary';

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
const ProviderHealthPage = lazy(() => import('../pages/ProviderHealthPage'));
const WebhookEventsPage = lazy(() => import('../pages/WebhookEventsPage'));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const ApiDocsPage = lazy(() => import('../pages/ApiDocsPage'));
const HelpPage = lazy(() => import('../pages/HelpPage'));
import TipRotator from '../components/TipRotator';

interface LoadingFallbackProps {
  message?: string;
}

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
        <Route path="/" element={<ErrorBoundary pageName="Loading"><LoadingPage /></ErrorBoundary>} />
        <Route path="/login" element={<ErrorBoundary pageName="Login"><Login /></ErrorBoundary>} />
        <Route path="/onboarding" element={<ErrorBoundary pageName="Onboarding"><OnboardingPage /></ErrorBoundary>} />

        {/* User Dashboard Routes - Wrapped in MainLayout */}
        <Route element={
          <ProtectedRoute>
            <MainLayout>
              <ErrorBoundary pageName="Dashboard Layout">
                <Outlet />
              </ErrorBoundary>
            </MainLayout>
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<ErrorBoundary pageName="Dashboard"><DashboardPage /></ErrorBoundary>} />
          <Route path="/activity" element={<ErrorBoundary pageName="Activity"><StandaloneActivity /></ErrorBoundary>} />
        </Route>

        {/* Admin routes - UberLayout handles its own navigation */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <UberLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<ErrorBoundary pageName="Overview"><OverviewPage /></ErrorBoundary>} />


          {/* Bot Management Routes */}
          <Route path="bots" element={<ErrorBoundary pageName="Bots"><BotsPage /></ErrorBoundary>} />
          <Route path="bots/create" element={<ErrorBoundary pageName="Create Bot"><BotCreatePage /></ErrorBoundary>} />
          <Route path="bots/templates" element={<ErrorBoundary pageName="Bot Templates"><BotTemplatesPage /></ErrorBoundary>} />

          {/* Each provider type gets its own top-level page with tabs */}
          <Route path="llm" element={<ErrorBoundary pageName="LLM"><LLMProvidersPage /></ErrorBoundary>} />
          <Route path="message" element={<ErrorBoundary pageName="Message"><MessageProvidersPage /></ErrorBoundary>} />
          <Route path="memory" element={<ErrorBoundary pageName="Memory"><MemoryProvidersPage /></ErrorBoundary>} />
          <Route path="tool" element={<ErrorBoundary pageName="Tool"><ToolProvidersPage /></ErrorBoundary>} />
          <Route path="config/response-profiles" element={<ErrorBoundary pageName="Response Profiles"><ResponseProfilesPage /></ErrorBoundary>} />

          {/* Personas and Guards are standalone pages */}
          <Route path="personas" element={<ErrorBoundary pageName="Personas"><PersonasPage /></ErrorBoundary>} />
          <Route path="guards" element={<ErrorBoundary pageName="Guards"><GuardsPage /></ErrorBoundary>} />

          {/* Legacy redirects */}
          <Route path="providers" element={<Navigate to="/admin/llm" replace />} />
          <Route path="providers/llm" element={<Navigate to="/admin/llm" replace />} />
          <Route path="providers/message" element={<Navigate to="/admin/message" replace />} />
          <Route path="providers/memory" element={<Navigate to="/admin/memory" replace />} />
          <Route path="providers/tool" element={<Navigate to="/admin/tool" replace />} />
          <Route path="integrations" element={<Navigate to="/admin/llm" replace />} />
          <Route path="integrations/:type" element={<ErrorBoundary pageName="Integrations"><IntegrationsPage /></ErrorBoundary>} />

          {/* Marketplace Route */}
          <Route path="marketplace" element={<ErrorBoundary pageName="Marketplace"><MarketplacePage /></ErrorBoundary>} />

          {/* MCP Routes */}
          <Route
            path="mcp"
            element={
              <ProtectedRoute>
                <ErrorBoundary pageName="MCP Server Manager">
                  <MCPServerManager />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="mcp/servers"
            element={
              <ProtectedRoute>
                <ErrorBoundary pageName="MCP Servers">
                  <MCPServersPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="mcp/tools"
            element={
              <ProtectedRoute>
                <ErrorBoundary pageName="MCP Tools">
                  <MCPToolsPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* guards is now a standalone route above */}

          {/* Activity & Monitoring — now consolidated into Overview tabs */}
          <Route path="activity" element={<Navigate to="/admin/overview?tab=activity" replace />} />
          <Route path="monitoring" element={<Navigate to="/admin/overview?tab=monitoring" replace />} />
          <Route path="monitoring/duel" element={<ErrorBoundary pageName="Bot Duel"><BotDuel /></ErrorBoundary>} />
          <Route path="monitoring-dashboard" element={<Navigate to="/admin/overview?tab=monitoring" replace />} />
          <Route path="analytics" element={<ErrorBoundary pageName="Analytics"><AnalyticsDashboard /></ErrorBoundary>} />
          <Route path="system-management" element={<ErrorBoundary pageName="System Management"><SystemManagement /></ErrorBoundary>} />

          <Route path="export" element={<ErrorBoundary pageName="Export"><ExportPage /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary pageName="Settings"><SystemSettings /></ErrorBoundary>} />
          <Route
            path="configuration"
            element={
              <ProtectedRoute>
                <ErrorBoundary pageName="Bot Configuration">
                  <BotConfigurationPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="config"
            element={
              <ProtectedRoute>
                <ErrorBoundary pageName="Config">
                  <ConfigPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          {/* Developer — tabbed page (Specs, Sitemap, UI Components, Static Pages) */}
          <Route path="developer" element={<ErrorBoundary pageName="Developer"><DeveloperPage /></ErrorBoundary>} />
          <Route path="static" element={<Navigate to="/admin/developer?tab=static-pages" replace />} />
          <Route path="sitemap" element={<Navigate to="/admin/developer?tab=sitemap" replace />} />
          <Route path="showcase" element={<Navigate to="/admin/developer?tab=showcase" replace />} />
          <Route path="specs" element={<Navigate to="/admin/developer?tab=specs" replace />} />
          <Route path="specs/:id" element={<ErrorBoundary pageName="Spec Detail"><SpecDetailPage /></ErrorBoundary>} />
          <Route path="audit" element={<ErrorBoundary pageName="Audit"><AuditPage /></ErrorBoundary>} />
          <Route path="health" element={<ErrorBoundary pageName="Health"><AdminHealthPage /></ErrorBoundary>} />
          <Route path="health/providers" element={<ErrorBoundary pageName="Provider Health"><ProviderHealthPage /></ErrorBoundary>} />

          <Route path="webhooks" element={<ErrorBoundary pageName="Webhook Events"><WebhookEventsPage /></ErrorBoundary>} />
          <Route path="api-docs" element={<ErrorBoundary pageName="API Docs"><ApiDocsPage /></ErrorBoundary>} />
          <Route path="help" element={<ErrorBoundary pageName="Help"><HelpPage /></ErrorBoundary>} />
          <Route path="about" element={<ErrorBoundary pageName="About"><AboutPage /></ErrorBoundary>} />

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
