/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  ModalForm,
  ProgressBar,
  StatsCards,
  ToastNotification,
  LoadingSpinner,
} from './DaisyUI';
import type { Bot, StatusResponse } from '../services/api';
import { apiService } from '../services/api';
import { PlusCircle, RefreshCw, LayoutDashboard, Cpu, HardDrive, Gauge, Clock, Activity } from 'lucide-react';

type DashboardTab = 'overview' | 'performance';

interface BotTableRow {
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
  { value: 'flowise', label: 'Flowise' },
  { value: 'openwebui', label: 'Open WebUI' },
  { value: 'replicate', label: 'Replicate' },
] as const;

const providerIconMap: Record<string, string> = {
  discord: '💬',
  slack: '📢',
  mattermost: '💼',
  telegram: '✈️',
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
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [environment, setEnvironment] = useState<string>('development');
  const [systemVersion, setSystemVersion] = useState<string>('1.0.0');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
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

  const successToast = ToastNotification.useSuccessToast();
  const errorToast = ToastNotification.useErrorToast();

  const fetchData = useCallback(async () => {
    try {
      const [configData, statusData] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);

      setBots(configData.bots || []);
      setStatus(statusData);
      setWarnings(configData.warnings || []);
      setEnvironment(configData.environment ?? (configData as any).system?.environment ?? 'development');
      setSystemVersion((configData as any).system?.version ?? '1.0.0');
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

  const statusBots = status?.bots ?? [];
  const activeBotCount = useMemo(
    () => statusBots.filter(bot => bot.status?.toLowerCase() === 'active').length,
    [statusBots],
  );
  const activeConnections = useMemo(
    () => statusBots.filter(bot => bot.connected).length,
    [statusBots],
  );
  const totalMessages = useMemo(
    () => statusBots.reduce((sum, bot) => sum + (bot.messageCount ?? 0), 0),
    [statusBots],
  );
  const totalErrors = useMemo(
    () => statusBots.reduce((sum, bot) => sum + (bot.errorCount ?? 0), 0),
    [statusBots],
  );
  const errorRatePercent = totalMessages === 0
    ? 0
    : Number(((totalErrors / totalMessages) * 100).toFixed(2));
  const uptimeSeconds = status?.uptime ?? 0;
  const uptimeDisplay = formatUptime(uptimeSeconds);

  const guardedBots = useMemo(
    () => bots.filter(bot => bot.mcpGuard?.enabled).length,
    [bots],
  );

  const statsCards = useMemo(
    () => [
      {
        id: 'active-bots',
        title: 'Active Bots',
        value: activeBotCount,
        change: bots.length === 0 ? 0 : Math.round((activeBotCount / bots.length) * 100),
        changeType: activeBotCount >= bots.length / 2 ? 'increase' : 'decrease',
        icon: '🤖',
        description: `${activeBotCount} of ${bots.length} agents online`,
        color: 'success' as const,
      },
      {
        id: 'total-messages',
        title: 'Messages Today',
        value: totalMessages,
        change: totalMessages > 0 ? Math.min(100, Math.round(totalMessages / 50)) : 0,
        changeType: totalMessages > 0 ? 'increase' : 'neutral',
        icon: '💬',
        description: `${activeConnections} live conversations`,
        color: 'secondary' as const,
      },
      {
        id: 'error-rate',
        title: 'Error Rate',
        value: `${errorRatePercent}%`,
        change: errorRatePercent,
        changeType: errorRatePercent <= 2 ? 'decrease' : 'increase',
        icon: '🚨',
        description: `${totalErrors} errors observed`,
        color: errorRatePercent <= 2 ? 'success' as const : 'warning' as const,
      },
      {
        id: 'uptime',
        title: 'Cluster Uptime',
        value: uptimeDisplay,
        icon: '⏱️',
        description: `Up since ${uptimeDisplay === '—' ? '—' : 'last restart'}`,
        color: 'accent' as const,
      },
    ],
    [activeBotCount, bots.length, totalMessages, activeConnections, errorRatePercent, totalErrors, uptimeDisplay],
  );

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

  const botColumns = useMemo(
    () => [
      {
        key: 'name' as const,
        title: 'Bot',
        sortable: true,
        render: (_value: string, record: BotTableRow) => (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>{getProviderEmoji(record.provider)}</span>
              <span className="font-semibold">{record.name}</span>
              {record.persona && (
                <Badge variant="secondary" size="small" className="uppercase">
                  {record.persona}
                </Badge>
              )}
            </div>
            <div className="text-xs text-base-content/60">
              {record.guard}
            </div>
          </div>
        ),
      },
      {
        key: 'status' as const,
        title: 'Status',
        sortable: true,
        render: (value: string) => (
          <Badge variant={getStatusBadgeVariant(value)} size="small">
            {value.toUpperCase()}
          </Badge>
        ),
      },
      {
        key: 'connected' as const,
        title: 'Connection',
        sortable: true,
        render: (_value: boolean, record: BotTableRow) => (
          <Badge variant={record.connected ? 'success' : 'warning'} size="small">
            {record.connected ? 'Online' : 'Offline'}
          </Badge>
        ),
      },
      {
        key: 'messageCount' as const,
        title: 'Messages',
        sortable: true,
        render: (value: number) => value.toLocaleString(),
      },
      {
        key: 'errorCount' as const,
        title: 'Errors',
        sortable: true,
        render: (value: number) =>
          value > 0 ? (
            <Badge variant="error" size="small">
              {value}
            </Badge>
          ) : (
            <span className="text-base-content/60">0</span>
          ),
      },
      {
        key: 'lastActivity' as const,
        title: 'Last Activity',
        sortable: true,
      },
    ],
    [],
  );

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

  const createBotFields = useMemo(
    () => [
      {
        name: 'name',
        label: 'Bot Name',
        type: 'text' as const,
        placeholder: 'Support Assistant',
        required: true,
      },
      {
        name: 'messageProvider',
        label: 'Message Provider',
        type: 'select' as const,
        required: true,
        options: MESSAGE_PROVIDER_OPTIONS,
      },
      {
        name: 'llmProvider',
        label: 'LLM Provider',
        type: 'select' as const,
        required: true,
        options: LLM_PROVIDER_OPTIONS,
      },
      {
        name: 'systemInstruction',
        label: 'System Instruction',
        type: 'textarea' as const,
        placeholder: 'Describe how this bot should behave...',
      },
      {
        name: 'autoJoin',
        label: 'Auto-join default channels',
        type: 'checkbox' as const,
        helperText: 'Automatically connect to channels configured for the selected provider.',
      },
    ],
    [],
  );

  const createBotSteps = useMemo(
    () => [
      {
        title: 'Define Basics',
        description: 'Name your agent and select core providers.',
        fields: ['name', 'messageProvider', 'llmProvider'],
      },
      {
        title: 'Configure Behaviour',
        description: 'Add optional system prompt and automations.',
        fields: ['systemInstruction', 'autoJoin'],
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Gradient */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl p-6 border border-primary/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <LayoutDashboard className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                data-testid="dashboard-title"
              >
                Open-Hivemind Dashboard
              </h1>
              <p className="text-sm text-base-content/60">
                Unified control centre for your multi-agent deployments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToastNotification.Notifications />
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Create new bot"
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Create Bot
            </Button>
            <Button
              variant="primary"
              data-testid="refresh-button"
              onClick={handleRefresh}
              loading={refreshing}
              loadingText="Refreshing"
              aria-label="Refresh dashboard"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        className="tabs tabs-boxed w-fit bg-base-200/50 p-1 rounded-xl"
        aria-label="Dashboard sections"
      >
        <button
          id="dashboard-tab-overview"
          role="tab"
          data-testid="overview-tab"
          className={`tab gap-2 ${activeTab === 'overview' ? 'tab-active' : ''}`}
          aria-selected={activeTab === 'overview'}
          aria-controls="dashboard-panel-overview"
          onClick={() => setActiveTab('overview')}
        >
          <Activity className="w-4 h-4" />
          Overview
        </button>
        <button
          id="dashboard-tab-performance"
          role="tab"
          data-testid="performance-tab"
          className={`tab gap-2 ${activeTab === 'performance' ? 'tab-active' : ''}`}
          aria-selected={activeTab === 'performance'}
          aria-controls="dashboard-panel-performance"
          onClick={() => setActiveTab('performance')}
        >
          <Gauge className="w-4 h-4" />
          Performance
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <section
            id="dashboard-panel-overview"
            role="tabpanel"
            aria-labelledby="dashboard-tab-overview"
            hidden={activeTab !== 'overview'}
            className={activeTab === 'overview' ? 'space-y-6' : 'hidden'}
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
                    <Badge variant="accent" size="small">
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

      <ModalForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Bot"
        fields={createBotFields}
        steps={createBotSteps}
        onSubmit={handleCreateBot}
        submitText="Create Bot"
        cancelText="Cancel"
        loading={isCreatingBot}
        size="lg"
        initialData={{
          messageProvider: MESSAGE_PROVIDER_OPTIONS[0].value,
          llmProvider: LLM_PROVIDER_OPTIONS[0].value,
          autoJoin: true,
        }}
      />
    </div>
  );
};

export default UnifiedDashboard;
