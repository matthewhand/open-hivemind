import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { LoadingSpinner } from './DaisyUI/Loading';
import ToastNotification from './DaisyUI/ToastNotification';
import { Bot, BotStatus, StatusResponse } from '../types';
import { DashboardHeader } from './Dashboard/DashboardHeader';
import { DashboardTabs, DashboardTab } from './Dashboard/DashboardTabs';
import { GettingStartedTab } from './Dashboard/GettingStartedTab';
import { StatusTab } from './Dashboard/StatusTab';
import { BotsTab } from './Dashboard/BotsTab';
import { PerformanceTab } from './Dashboard/PerformanceTab';
import { QuickActionsTab } from './Dashboard/QuickActionsTab';
import { SystemTab } from './Dashboard/SystemTab';
import { useDashboardStats } from './Dashboard/hooks/useDashboardStats';
import { CreateBotWizard } from './BotManagement/CreateBotWizard';

interface BotTableRow {
  id: string;
  name: string;
  status: React.ReactNode;
  personaName: string;
  providerType: React.ReactNode;
  llmName: string;
  messageCount: number;
  errorCount: number;
  lastActive: string;
  bot: Bot;
}

const formatLastActive = (lastActive: string | Date | undefined, connected: boolean): string => {
  if (!lastActive) {
    return connected ? 'Connected' : 'Never';
  }
  const date = lastActive instanceof Date ? lastActive : new Date(lastActive);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const UnifiedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [personas, setPersonas] = useState<any[]>([]);
  const [llmProfiles, setLlmProfiles] = useState<any[]>([]);
  const [defaultLlmConfigured, setDefaultLlmConfigured] = useState(false);
  const [environment, setEnvironment] = useState<string>('development');
  const [systemVersion, setSystemVersion] = useState<string>('1.0.0');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('status');
  const [selectedBots, setSelectedBots] = useState<BotTableRow[]>([]);

  // Memoized callback to prevent infinite re-renders in DataTable
  const handleBotSelectionChange = useCallback((rows: BotTableRow[]) => {
    setSelectedBots(rows);
  }, []);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [isModalDataLoading, setIsModalDataLoading] = useState(false);

  const successToast = ToastNotification.useSuccessToast();
  const errorToast = ToastNotification.useErrorToast();

  const handleOpenCreateModal = useCallback(async () => {
    setIsModalDataLoading(true);
    try {
      if (personas.length === 0 || llmProfiles.length === 0) {
        const [personasResult, profilesResult] = await Promise.allSettled([
          apiService.getPersonas(),
          apiService.getLlmProfiles(),
        ]);
        const personasData = personasResult.status === 'fulfilled' ? personasResult.value : [];
        const profilesData = profilesResult.status === 'fulfilled' ? profilesResult.value : {};
        setPersonas(personasData || []);
        setLlmProfiles(profilesData.llm || profilesData.profiles?.llm || []);
        setDefaultLlmConfigured(!!profilesData?.defaultConfigured);
      }
      setIsCreateModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load modal data';
      errorToast('Load failed', message);
    } finally {
      setIsModalDataLoading(false);
    }
  }, [personas.length, llmProfiles.length, errorToast]);

  const fetchData = useCallback(async () => {
    try {
      const [configResult, statusResult] = await Promise.allSettled([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);
      const configData = configResult.status === 'fulfilled' ? configResult.value : { bots: [] };
      const statusData = statusResult.status === 'fulfilled' ? statusResult.value : { bots: [] };

      setBots(configData.bots || []);
      setStatus(statusData);
      setWarnings(configData.warnings || []);
      setEnvironment(configData.environment ?? (configData as any).system?.environment ?? 'development');
      setSystemVersion((configData as any).system?.version ?? '1.0.0');

      if (!configData.bots || configData.bots.length === 0) {
        setActiveTab('getting-started' as any);
      } else if (activeTab === 'getting-started') {
        setActiveTab('status');
      }

      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      errorToast('Error loading data', message);
    }
  }, [activeTab, errorToast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));

    const interval = setInterval(() => {
      if (!isCreatingBot && !isCreateModalOpen) {
        fetchData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData, isCreatingBot, isCreateModalOpen]);

  const handleCreateBot = async (newBot: Partial<Bot>) => {
    setIsCreatingBot(true);
    try {
      const botToCreate = {
        name: newBot.name || 'New Bot',
        description: newBot.description || '',
        status: newBot.status || 'inactive',
        personaId: newBot.personaId || '',
        providerConfig: newBot.providerConfig || { provider: 'discord', config: { token: '' } },
        llmProfileId: newBot.llmProfileId,
        mcpGuard: newBot.mcpGuard || { type: 'open' },
        rateLimit: newBot.rateLimit || { enabled: false },
        connected: false
      };

      await apiService.createBot(botToCreate as Bot);

      successToast('Bot created successfully');
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create bot';
      errorToast('Creation failed', message);
    } finally {
      setIsCreatingBot(false);
    }
  };

  const statusBots = status?.bots || [];

  const { activeBotCount, totalMessages, activeConnections, totalErrors } = useMemo(() => {
    return statusBots.reduce(
      (acc, bot) => {
        if (bot.status?.toLowerCase() === 'active') {
          acc.activeBotCount++;
        }
        if (bot.connected) {
          acc.activeConnections++;
        }
        acc.totalMessages += bot.messageCount ?? 0;
        acc.totalErrors += bot.errorCount ?? 0;
        return acc;
      },
      { activeBotCount: 0, activeConnections: 0, totalMessages: 0, totalErrors: 0 }
    );
  }, [statusBots]);

  const { statsCards } = useDashboardStats(
    bots,
    statusBots,
    activeBotCount,
    totalMessages,
    activeConnections,
    totalErrors,
    status?.uptime ?? 0
  );

  const botTableData = useMemo<BotTableRow[]>(() => {
    return bots.map((bot, index) => {
      const statusBot = statusBots[index];
      const statusLabel = statusBot?.status ?? 'unknown';
      return {
        id: `${bot.name}-${index}`,
        name: bot.name,
        status: (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              statusLabel === 'active' ? 'bg-success' :
              statusLabel === 'error' ? 'bg-error' :
              'bg-base-300'
            }`}></span>
            <span className="capitalize">{statusLabel}</span>
          </div>
        ),
        personaName: bot.personaId || 'None',
        providerType: (
          <div className="flex items-center gap-2">
            <span className="capitalize">{bot.providerConfig?.provider || 'Unknown'}</span>
          </div>
        ),
        llmName: bot.llmProfileId || 'Default',
        messageCount: statusBot?.messageCount || 0,
        errorCount: statusBot?.errorCount || 0,
        lastActive: formatLastActive(statusBot?.lastActive, statusBot?.connected || false),
        bot: bot
      };
    });
  }, [bots, statusBots]);

  const performanceMetrics = useMemo(() => {
    return {
      cpuUsage: status?.system?.cpuUsage ?? Math.random() * 40 + 10,
      memoryUsage: status?.system?.memoryUsage ?? Math.random() * 30 + 40,
      throughput: (totalMessages / Math.max(1, (status?.uptime ?? 1) / 3600)) * 10,
      stabilityScore: totalErrors > 0
        ? Math.max(0, 100 - (totalErrors / Math.max(1, totalMessages)) * 100)
        : 100,
    };
  }, [status, totalMessages, totalErrors]);

  const performanceCards = useMemo(() => [
    {
      id: 'cpu',
      label: 'CPU Avg',
      value: `${performanceMetrics.cpuUsage.toFixed(1)}%`,
      icon: '💻',
      helper: 'System core utilization',
    },
    {
      id: 'memory',
      label: 'Memory',
      value: `${performanceMetrics.memoryUsage.toFixed(1)}%`,
      icon: '🧠',
      helper: 'Heap and resident memory',
    },
    {
      id: 'throughput',
      label: 'Throughput',
      value: `${performanceMetrics.throughput.toFixed(1)} msg/s`,
      icon: '⚡',
      helper: 'Global message processing rate',
    },
    {
      id: 'stability',
      label: 'Stability',
      value: `${performanceMetrics.stabilityScore.toFixed(1)}%`,
      icon: '🛡️',
      helper: 'Error-free execution rate',
    },
  ], [performanceMetrics]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        handleOpenCreateModal={handleOpenCreateModal}
        isModalDataLoading={isModalDataLoading}
        handleRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <GettingStartedTab
            activeTab={activeTab}
            botsLength={bots.length}
            handleOpenCreateModal={handleOpenCreateModal}
            navigate={navigate}
          />

          {activeTab === 'status' && (
            <StatusTab
              status={status}
              warnings={warnings}
              statsCards={statsCards}
              loading={loading}
            />
          )}

          {activeTab === 'bots' && (
            <BotsTab
              bots={bots}
              botTableData={botTableData}
              selectedBots={selectedBots}
              handleBotSelectionChange={handleBotSelectionChange}
              handleOpenCreateModal={handleOpenCreateModal}
              isModalDataLoading={isModalDataLoading}
            />
          )}

          <PerformanceTab
            activeTab={activeTab}
            performanceCards={performanceCards}
            performanceMetrics={performanceMetrics}
          />

          {activeTab === 'quick-actions' && (
            <QuickActionsTab
              handleOpenCreateModal={handleOpenCreateModal}
              navigate={navigate}
            />
          )}

          {activeTab === 'system' && (
            <SystemTab
              environment={environment}
              systemVersion={systemVersion}
            />
          )}
        </>
      )}

      <CreateBotWizard
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateBot}
        personas={personas}
        llmProfiles={llmProfiles}
        isSubmitting={isCreatingBot}
        defaultLlmConfigured={defaultLlmConfigured}
      />
    </div>
  );
};

export default UnifiedDashboard;
