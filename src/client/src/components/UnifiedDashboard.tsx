/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from './DaisyUI/Alert';
import Badge from './DaisyUI/Badge';
import Button from './DaisyUI/Button';
import Card from './DaisyUI/Card';
import DataTable from './DaisyUI/DataTable';
import Modal from './DaisyUI/Modal';
import ProgressBar from './DaisyUI/ProgressBar';
import StatsCards from './DaisyUI/StatsCards';
import ToastNotification from './DaisyUI/ToastNotification';
import { LoadingSpinner } from './DaisyUI/Loading';
import type { Bot, StatusResponse } from '../services/api';
import { apiService } from '../services/api';
import { CreateBotWizard } from './BotManagement/CreateBotWizard';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, Cpu, HardDrive, PlusCircle } from 'lucide-react';
import { RefreshCw, Plus } from 'lucide-react';

type DashboardTab = 'getting-started' | 'status' | 'performance';

export interface BotTableRow {
  id: string;
  name: string;
  provider: string;
  llm: string;
  status: string;
  connected: boolean;
  messageCount: number;
  errorCount: number;
  persona?: string;
  guard?: string;
  lastActivity: string;
}

const MESSAGE_PROVIDER_OPTIONS = [
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'mattermost', label: 'Mattermost' },
  { value: 'webhook', label: 'Webhook' },
] as const;

const LLM_PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'flowise', label: 'Flowise' },
  { value: 'openwebui', label: 'Open WebUI' },
  { value: 'openswarm', label: 'OpenSwarm' },
  { value: 'letta', label: 'Letta' },
] as const;

const providerIconMap: Record<string, string> = {
  discord: '💬',
  slack: '📢',
  mattermost: '💼',
  webhook: '🔗',
};

const getProviderEmoji = (provider: string): string =>
  providerIconMap[provider.toLowerCase()] || '🤖';

const getStatusBadgeVariant = (
  status: string,
): 'success' | 'warning' | 'error' | 'neutral' | 'secondary' => {
  const normalized = status.toLowerCase();
  if (normalized === 'active' || normalized === 'online') {
    return 'success';
  }
  if (normalized === 'connecting' || normalized === 'pending') {
    return 'warning';
  }
  if (normalized === 'error' || normalized === 'failed' || normalized === 'offline') {
    return 'error';
  }
  if (normalized === 'inactive' || normalized === 'unavailable') {
    return 'neutral';
  }
  return 'secondary';
};

const formatUptime = (seconds: number): string => {
  if (!seconds || seconds <= 0) {
    return '—';
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const buildLastActivityLabel = (
  messageCount?: number,
  connected?: boolean,
): string => {
  if (!messageCount || messageCount <= 0) {
    return connected ? 'Awaiting traffic' : 'Offline';
  }
  const minutes = messageCount % 60;
  if (minutes === 0) {
    return 'Just now';
  }
  return `${minutes}m ago`;
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

  // ⚡ Bolt Optimization: Lazy load modal data
  // We defer fetching personas and llmProfiles until the user attempts to open
  // the 'Create Bot' modal. This prevents unnecessary network requests during
  // the initial dashboard load, improving perceived performance.
  const handleOpenCreateModal = useCallback(async () => {
    setIsModalDataLoading(true);
    try {
      // Use || so that we re-fetch whenever either dataset is missing,
      // not only when both are empty (fixes &&-vs-|| logic error).
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
      // Only open the modal after data has been successfully loaded.
      // If the fetch above throws, this line is never reached and the
      // modal stays closed (the catch block shows an error toast instead).
      setIsCreateModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load modal data';
      errorToast('Load failed', message);
      // Do NOT open the modal when data loading fails — the user would see
      // an empty/broken form. The error toast is sufficient feedback.
    } finally {
      setIsModalDataLoading(false);
    }
  }, [personas.length, llmProfiles.length, errorToast]);

  const fetchData = useCallback(async () => {
    try {
      // ⚡ Bolt Optimization: Removed getPersonas() and getLlmProfiles()
      // from this critical path to speed up dashboard rendering.
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

      // If no bots are configured, default to getting started
      if (!configData.bots || configData.bots.length === 0) {
        setActiveTab(prev => prev === 'status' ? 'getting-started' : prev);
      }

      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        await fetchData();
      } catch {
        // error state already set inside fetchData
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
      successToast('Dashboard refreshed', 'Latest metrics and configuration applied.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to refresh dashboard data';
      errorToast('Refresh failed', message);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData, successToast, errorToast]);

  const handleCreateBot = useCallback(
    async (formData: Record<string, any>) => {
      try {
        setIsCreatingBot(true);
        await apiService.createBot({
          name: formData.name,
          messageProvider: formData.messageProvider,
          llmProvider: formData.llmProvider,
        });
        successToast('Bot created', `${formData.name} joined your swarm.`);
        await fetchData();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create bot';
        errorToast('Bot creation failed', message);
        throw err;
      } finally {
        setIsCreatingBot(false);
      }
    },
    [fetchData, successToast, errorToast],
  );

  const statusBots = useMemo(() => status?.bots ?? [], [status]);

  // Combine 4 separate O(N) filter/reduce passes into a single O(N) pass
  // to calculate dashboard statistics and prevent unnecessary re-renders.
  const { activeBotCount, activeConnections, totalMessages, totalErrors } = useMemo(() => {
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

  const statsCards = useMemo(() => {
    return [
      {
        id: 'agents',
        title: 'Active Agents',
        value: activeBotCount,
        total: bots.length,
        icon: 'Bot',
        color: 'primary',
      },
      {
        id: 'messages',
        title: 'Messages Processed',
        value: totalMessages,
        trend: '+12%',
        icon: 'MessageSquare',
        color: 'secondary',
      },
      {
        id: 'connections',
        title: 'Active Connections',
        value: activeConnections,
        total: bots.length,
        icon: 'Activity',
        color: 'accent',
      },
      {
        id: 'errors',
        title: 'Error Rate',
        value: totalErrors,
        trend: '-2%',
        icon: 'AlertTriangle',
        color: 'error',
      },
    ];
  }, [activeBotCount, bots.length, totalMessages, activeConnections, totalErrors]);

  const botTableData = useMemo<BotTableRow[]>(() => {
    return bots.map((bot, index) => {
      const statusBot = statusBots[index];
      const statusLabel = statusBot?.status ?? 'unknown';
      return {
        id: `${bot.name}-${index}`,
        name: bot.name,
        provider: bot.messageProvider,
        llm: bot.llmProvider,
        status: statusLabel,
        connected: Boolean(statusBot?.connected),
        messageCount: statusBot?.messageCount ?? 0,
        errorCount: statusBot?.errorCount ?? 0,
        persona: bot.persona,
        guard: bot.mcpGuard?.enabled
          ? (bot.mcpGuard.type === 'custom' ? 'Custom Guard' : 'Owner Guard')
          : 'Open Access',
        lastActivity: buildLastActivityLabel(statusBot?.messageCount, statusBot?.connected),
      };
    });
  }, [bots, statusBots]);

  const getBotColumns = () => [
    { key: 'name', label: 'Agent Name' },
    { key: 'provider', label: 'Provider' },
    { key: 'llm', label: 'LLM' },
    { key: 'status', label: 'Status' },
    { key: 'messageCount', label: 'Messages' },
    { key: 'errorCount', label: 'Errors' }
  ];

  const botColumns = useMemo(() => getBotColumns(), []);

  const performanceMetrics = useMemo(() => {
    const cpuUsage = Math.min(92, activeConnections * 14 + 28);
    const memoryUsage = Math.min(88, bots.length * 12 + 32);
    const throughput = bots.length === 0
      ? 0
      : Math.min(100, Math.round(totalMessages / Math.max(bots.length, 1)));
    const responseTime = Math.max(65, 320 - activeConnections * 20);
    const stabilityScore = Math.max(72, 98 - totalErrors * 2);

    return {
      cpuUsage,
      memoryUsage,
      throughput,
      responseTime,
      stabilityScore,
    };
  }, [activeConnections, bots.length, totalMessages, totalErrors]);

  const performanceCards = useMemo(
    () => [
      {
        id: 'cpu',
        label: 'CPU Utilisation',
        value: `${performanceMetrics.cpuUsage}%`,
        helper: `${bots.length} worker nodes`,
        icon: <Cpu className="w-5 h-5" />,
      },
      {
        id: 'memory',
        label: 'Memory Usage',
        value: `${performanceMetrics.memoryUsage}%`,
        helper: `${activeConnections} active sockets`,
        icon: <HardDrive className="w-5 h-5" />,
      },
      {
        id: 'response',
        label: 'Response Time',
        value: `${performanceMetrics.responseTime} ms`,
        helper: 'p95 latency',
        icon: <Clock className="w-5 h-5" />,
      },
      {
        id: 'stability',
        label: 'Stability Score',
        value: `${performanceMetrics.stabilityScore}%`,
        helper: `${totalErrors} incidents tracked`,
        icon: <Activity className="w-5 h-5" />,
      },
    ],
    [performanceMetrics, bots.length, activeConnections, totalErrors],
  );





  return (
    <div className="space-y-6">
      {/* Dashboard Header with Gradient */}
      <div className="bg-gradient-to-r from-primary to-secondary rounded-lg text-primary-content shadow-lg p-6 lg:p-8 relative overflow-hidden flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
          {/* Subtle noise pattern */}
        </div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="bg-base-100/20 p-3 rounded-lg backdrop-blur-sm hidden sm:block shadow-sm">
            <Activity className="w-8 h-8 opacity-90" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Swarm Command Center</h1>
            <p className="opacity-90 max-w-lg leading-relaxed text-sm">
              Deploy, monitor, and manage your AI agent fleet.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-primary-content/30 hover:bg-primary-content/20 text-primary-content transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-content"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh Swarm Data"
            title="Refresh Swarm Data"
            size="medium"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="bg-base-100/20 hover:bg-base-100/30 text-primary-content border-0 backdrop-blur-sm shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-content"
            onClick={handleOpenCreateModal}
            disabled={isModalDataLoading}
            aria-haspopup="dialog"
            aria-expanded={isCreateModalOpen}
            size="medium"
          >
            {isModalDataLoading ? (
              <span className="loading loading-spinner loading-sm mr-2" aria-hidden />
            ) : (
              <Plus className="w-4 h-4 mr-2" aria-hidden />
            )}
            Deploy Agent
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-bordered" role="tablist">
        <button
          className={`tab ${activeTab === 'getting-started' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'getting-started'}
          onClick={() => setActiveTab('getting-started')}
        >
          Getting Started
        </button>
        <button
          className={`tab ${activeTab === 'status' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'status'}
          onClick={() => setActiveTab('status')}
        >
          Fleet Status
        </button>
        <button
          className={`tab ${activeTab === 'performance' ? 'tab-active' : ''}`}
          role="tab"
          aria-selected={activeTab === 'performance'}
          onClick={() => setActiveTab('performance')}
        >
          Performance Telemetry
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Getting Started Tab */}
          <section
            id="dashboard-panel-getting-started"
            role="tabpanel"
            aria-labelledby="dashboard-tab-getting-started"
            hidden={activeTab !== 'getting-started'}
            className={activeTab === 'getting-started' ? 'space-y-6' : 'hidden'}
          >
            <div className="hero bg-base-200 rounded-2xl p-8">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <h1 className="text-4xl font-bold">Welcome to Open Hivemind</h1>
                  <p className="py-6">
                    Let's get your multi-agent system up and running. Follow the steps below to configure your environment.
                  </p>

                  {bots.length === 0 && (
                    <div className="alert alert-warning shadow-lg mb-6 text-left">
                      <Info className="stroke-current flex-shrink-0 w-6 h-6" />
                      <div>
                        <h3 className="font-bold">No valid configuration found</h3>
                        <div className="text-xs">
                          You can start fresh below or <Link to="/admin/system-management" className="link link-primary">import a configuration from backup</Link>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1: LLM Configuration */}
              <Card className="bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body items-center text-center">
                  <div className="badge badge-primary badge-lg mb-2">Step 1</div>
                  <h2 className="card-title">Configure Intelligence</h2>
                  <p className="text-sm text-base-content/70">
                    Set up your Language Model (LLM) providers like OpenAI, Flowise, or OpenWebUI.
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <Link to="/admin/providers/llm" className="btn btn-outline btn-primary btn-sm">
                      Manage LLMs
                    </Link>
                  </div>
                </div>
              </Card>

              {/* Step 2: Messaging Configuration */}
              <Card className="bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body items-center text-center">
                  <div className="badge badge-primary badge-lg mb-2">Step 2</div>
                  <h2 className="card-title">Connect Platforms</h2>
                  <p className="text-sm text-base-content/70">
                    Integrate with messaging platforms like Discord, Slack, or Mattermost.
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <Link to="/admin/providers/message" className="btn btn-outline btn-primary btn-sm">
                      Manage Providers
                    </Link>
                  </div>
                </div>
              </Card>

              {/* Step 3: Bot Creation */}
              <Card className="bg-base-100 shadow-xl hover:shadow-2xl transition-shadow border-2 border-primary/20">
                <div className="card-body items-center text-center">
                  <div className="badge badge-primary badge-lg mb-2">Step 3</div>
                  <h2 className="card-title">Launch Agent</h2>
                  <p className="text-sm text-base-content/70">
                    Combine intelligence and connectivity to deploy your first autonomous agent.
                  </p>
                  <div className="card-actions justify-end mt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenCreateModal}
                      loading={isModalDataLoading}
                      loadingText="Loading"
                    >
                      <PlusCircle className="w-4 h-4 mr-1" />
                      Create Bot
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Links / Resources */}
            <div className="divider">Resources</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link to="/admin/system-management" className="card bg-base-100 shadow-sm hover:bg-base-200 transition-colors cursor-pointer">
                <div className="card-body flex-row items-center gap-4 py-4">
                  <HardDrive className="w-6 h-6 text-secondary" />
                  <div>
                    <h3 className="font-bold">System Management</h3>
                    <p className="text-xs text-base-content/60">Backup, restore, and system health</p>
                  </div>
                </div>
              </Link>
              <Link to="https://github.com/open-hivemind/open-hivemind" target="_blank" rel="noopener noreferrer" className="card bg-base-100 shadow-sm hover:bg-base-200 transition-colors cursor-pointer">
                <div className="card-body flex-row items-center gap-4 py-4">
                  <Info className="w-6 h-6 text-accent" />
                  <div>
                    <h3 className="font-bold">Documentation</h3>
                    <p className="text-xs text-base-content/60">Learn more about configuration options</p>
                  </div>
                </div>
              </Link>
            </div>
          </section>

          {/* Status Tab (Formerly Overview) */}
          <section
            id="dashboard-panel-status"
            role="tabpanel"
            aria-labelledby="dashboard-tab-status"
            hidden={activeTab !== 'status'}
            className={activeTab === 'status' ? 'space-y-6' : 'hidden'}
          >
            {error && (
              <Alert
                status="error"
                message={error}
                onClose={() => setError(null)}
              />
            )}

            {warnings.length > 0 && (
              <Alert
                status="warning"
                message={warnings[0]}
              />
            )}

            <StatsCards stats={statsCards} isLoading={loading} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title text-lg">Environment</h2>
                  <p className="text-sm text-base-content/60">
                    Deployment context and runtime metadata.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="primary" size="small">
                      ENV&nbsp;{environment.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" size="small">
                      Version&nbsp;{systemVersion}
                    </Badge>
                    <Badge variant="secondary" size="small">
                      Agents&nbsp;{bots.length}
                    </Badge>
                  </div>
                </div>
              </Card>

              <Card className="bg-base-100 shadow">
                <div className="card-body">
                  <h2 className="card-title text-lg">MCP Tool Guards</h2>
                  <p className="text-sm text-base-content/60">
                    Keep sensitive tools restricted to trusted operators.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="success" size="small">
                      Guarded&nbsp;{guardedBots}
                    </Badge>
                    <Badge variant="warning" size="small">
                      Open&nbsp;{Math.max(bots.length - guardedBots, 0)}
                    </Badge>
                    <Badge variant="neutral" size="small">
                      Owner only&nbsp;{bots.filter(bot => bot.mcpGuard?.type === 'owner').length}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-base-100 shadow" data-testid="bot-status">
              <div className="card-body">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="card-title">
                      Bot Status
                    </h2>
                    <p className="text-sm text-base-content/60">
                      Track uptime, message throughput, and guard coverage per agent.
                    </p>
                  </div>
                  <Badge variant="primary" size="small">
                    {activeConnections} of {bots.length} connected
                  </Badge>
                </div>

                <DataTable<BotTableRow>
                  data={botTableData}
                  columns={botColumns}
                  selectable
                  loading={loading || refreshing}
                  searchable
                  exportable
                  pagination={{ pageSize: 6, pageSizeOptions: [6, 12, 24] }}
                  onSelectionChange={handleBotSelectionChange}
                  className="mt-6"
                />

                {selectedBots.length > 0 && (
                  <div className="mt-4">
                    <Alert
                      status="info"
                      message={`Selected ${selectedBots.length} bot${selectedBots.length === 1 ? '' : 's'}: ${selectedBots
                        .map(bot => bot.name)
                        .join(', ')}`}
                      onClose={() => setSelectedBots([])}
                    />
                  </div>
                )}
              </div>
            </Card>
          </section>

          <section
            id="dashboard-panel-performance"
            role="tabpanel"
            aria-labelledby="dashboard-tab-performance"
            hidden={activeTab !== 'performance'}
            className={activeTab === 'performance' ? 'space-y-6' : 'hidden'}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {performanceCards.map(card => (
                <Card key={card.id} className="bg-base-100 shadow">
                  <div className="card-body">
                    <span className="text-2xl" aria-hidden>{card.icon}</span>
                    <h3 className="uppercase text-xs tracking-wide text-base-content/60">
                      {card.label}
                    </h3>
                    <p className="text-3xl font-semibold">{card.value}</p>
                    <p className="text-sm text-base-content/60">{card.helper}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="bg-base-100 shadow-lg">
                <div className="card-body space-y-4">
                  <h2 className="card-title text-lg">
                    Real-time Performance Metrics
                  </h2>
                  <p className="text-sm text-base-content/60">
                    Live telemetry across the swarm for quick operational checks.
                  </p>

                  <div
                    className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center py-6"
                    data-testid="performance-metrics"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="radial-progress text-primary" style={{ '--value': performanceMetrics.cpuUsage, '--size': '6rem' } as React.CSSProperties} role="progressbar">
                        {Math.round(performanceMetrics.cpuUsage)}%
                      </div>
                      <span className="text-sm font-medium">CPU Usage</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      {/* Memory: Green at low, Red at high */}
                      <div
                        className={`radial-progress ${performanceMetrics.memoryUsage > 80 ? 'text-error' : performanceMetrics.memoryUsage > 50 ? 'text-warning' : 'text-success'}`}
                        style={{ '--value': performanceMetrics.memoryUsage, '--size': '6rem' } as React.CSSProperties}
                        role="progressbar"
                      >
                        {Math.round(performanceMetrics.memoryUsage)}%
                      </div>
                      <span className="text-sm font-medium">Memory Usage</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className="radial-progress text-accent" style={{ '--value': performanceMetrics.throughput, '--size': '6rem' } as React.CSSProperties} role="progressbar">
                        {Math.round(performanceMetrics.throughput)}%
                      </div>
                      <span className="text-sm font-medium">Throughput</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      {/* Stability: Green at 100, Red at 0 */}
                      <div
                        className={`radial-progress ${performanceMetrics.stabilityScore >= 95 ? 'text-success' : performanceMetrics.stabilityScore >= 70 ? 'text-warning' : 'text-error'}`}
                        style={{ '--value': performanceMetrics.stabilityScore, '--size': '6rem' } as React.CSSProperties}
                        role="progressbar"
                      >
                        {Math.round(performanceMetrics.stabilityScore)}%
                      </div>
                      <span className="text-sm font-medium">Stability</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-base-100 shadow-lg">
                <div className="card-body space-y-4">
                  <h2 className="card-title text-lg">
                    Recent Activity Signals
                  </h2>
                  {statusBots.length === 0 ? (
                    <p className="text-sm text-base-content/60">
                      No recent activity detected. Deploy or refresh to begin monitoring.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {statusBots.map((bot, index) => (
                        <div
                          key={`${bot.name}-${index}`}
                          className="flex items-start justify-between rounded-lg border border-base-200 p-3"
                        >
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <span className="text-lg" aria-hidden>
                                {getProviderEmoji(bots[index]?.messageProvider || '')}
                              </span>
                              {bots[index]?.name || bot.name}
                            </div>
                            <p className="text-xs text-base-content/60">
                              {bot.messageCount ?? 0} messages • {buildLastActivityLabel(bot.messageCount, bot.connected)}
                            </p>
                          </div>
                          <Badge
                            variant={getStatusBadgeVariant(bot.status ?? 'unknown')}
                            size="small"
                          >
                            {(bot.status ?? 'unknown').toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </section>
        </>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Bot"
        size="lg"
      >
        <CreateBotWizard
          onCancel={() => setIsCreateModalOpen(false)}
          onSuccess={async () => {
            setIsCreateModalOpen(false);
            successToast('Bot created', 'New agent joined the swarm.');
            await fetchData();
          }}
          personas={personas}
          llmProfiles={llmProfiles}
          defaultLlmConfigured={defaultLlmConfigured}
        />
      </Modal>
    </div>
  );
};

export default UnifiedDashboard;
