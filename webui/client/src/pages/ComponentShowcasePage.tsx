import React from 'react';
import {
  AccessibilityComponents,
  ActivityMonitor,
  ActivityTimeline,
  ApiEndpointConfig,
  ApiStatusMonitor,
  BotStatusCard,
  CIDeploymentManager,
  ConfigManager,
  ConfigSources,
  ConfigurationAnalytics,
  ConfigurationValidation,
  ConfigurationWizard,
  ConfigViewer,
  Dashboard_Old,
  Dashboard,
  EnhancedDashboard,
  EnterpriseManager,
  EnvironmentManager,
  ErrorBoundary,
  HiddenFeatureToggle,
  HotReloadManager,
  PageHeader,
  PerformanceMonitor,
  QuickActions,
  RealTimeUpdates,
  ReduxProvider,
  ResponsiveComponents,
  SecureConfigManager,
  SystemHealth,
} from '../components';

import {
  ActivityMonitor as AdminActivityMonitor,
  AgentForm,
  ComprehensiveAdminDashboard,
  EnhancedAgentConfigurator,
  EnvMonitor,
  MCPServerManager as AdminMCPServerManager,
  PersonaManager as AdminPersonaManager,
} from '../components/Admin';

import {
  AgentConfigCard,
  AgentConfigurator,
} from '../components/AgentConfigurator';

import {
  ActivityLog,
  AgentCard,
  AgentGrid,
  LLMUsageChart,
  MessageVolumeChart,
} from '../components/Dashboard';

import {
  ActivityCharts,
  MonitoringDashboard,
} from '../components/Monitoring';

import {
  SettingsGeneral,
  SettingsIntegrations,
  SettingsSecurity,
} from '../components/Settings';

const ComponentShowcasePage: React.FC = () => {
  return (
    <div>
      <h1>Component Showcase</h1>
      <AccessibilityComponents />
      <ActivityMonitor />
      <ActivityTimeline />
      <ApiEndpointConfig />
      <ApiStatusMonitor />
      <BotStatusCard />
      <CIDeploymentManager />
      <ConfigManager />
      <ConfigSources />
      <ConfigurationAnalytics />
      <ConfigurationValidation />
      <ConfigurationWizard />
      <ConfigViewer />
      <Dashboard_Old />
      <Dashboard />
      <EnhancedDashboard />
      <EnterpriseManager />
      <EnvironmentManager />
      <ErrorBoundary>
        <p>Error Boundary Child</p>
      </ErrorBoundary>
      <HiddenFeatureToggle />
      <HotReloadManager />
      <PageHeader />
      <PerformanceMonitor />
      <QuickActions />
      <RealTimeUpdates />
      <ReduxProvider>
        <p>Redux Provider Child</p>
      </ReduxProvider>
      <ResponsiveComponents />
      <SecureConfigManager />
      <SystemHealth />
      <AdminActivityMonitor />
      <AgentForm />
      <ComprehensiveAdminDashboard />
      <EnhancedAgentConfigurator />
      <EnvMonitor />
      <AdminMCPServerManager />
      <AdminPersonaManager />
      <AgentConfigCard />
      <AgentConfigurator />
      <ActivityLog />
      <AgentCard />
      <AgentGrid />
      <LLMUsageChart />
      <MessageVolumeChart />
      <ActivityCharts />
      <MonitoringDashboard />
      <SettingsGeneral />
      <SettingsIntegrations />
      <SettingsSecurity />
    </div>
  );
};

export default ComponentShowcasePage;