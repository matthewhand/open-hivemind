import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import Card from '../components/DaisyUI/Card';
import Badge from '../components/DaisyUI/Badge';
import { Alert } from '../components/DaisyUI/Alert';
import Button from '../components/DaisyUI/Button';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import Tabs from '../components/DaisyUI/Tabs';
import type { TabItem } from '../components/DaisyUI/Tabs';
const LLMUsageChart = lazy(() => import('../components/Dashboard/LLMUsageChart'));
const MessageVolumeChart = lazy(() => import('../components/Dashboard/MessageVolumeChart'));
import {
  Activity,
  AlertTriangle,
  ChartBar,
  Clock,
  Cpu,
  Heart,
  RotateCcw,
  Server,
} from 'lucide-react';
import SystemHealth from '../components/SystemHealth';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Select from '../components/DaisyUI/Select';
import BotStatusCard from '../components/BotStatusCard';
import ActivityMonitor from '../components/Monitoring/ActivityMonitor';
const ActivityCharts = lazy(() => import('../components/Monitoring/ActivityCharts'));
import DistributedTraceWaterfall, { TraceSpan } from '../components/Monitoring/DistributedTraceWaterfall';
import BotActivityWaterfallMonitor from '../components/Monitoring/BotActivityWaterfallMonitor';
import { apiService } from '../services/api';
import type { StatusResponse, Bot } from '../services/api';
import type { BotConfig } from '../types/bot';
import type { PipelineTrace } from '../services/api/monitoring';
import Debug from 'debug';
const debug = Debug('app:client:components:Monitoring:MonitoringDashboard');

/**
 * Map a server-side pipeline trace (PipelineTracer ring buffer) to the
 * flat span shape the waterfall component renders. Span start times are
 * made relative to the trace start.
 */
const pipelineTraceToSpans = (trace: PipelineTrace): TraceSpan[] => {
  const service = String(trace.rootSpan.attributes?.botName ?? 'pipeline');
  return trace.spans.map((span) => ({
    id: span.id,
    parentId: span.id === trace.rootSpan.id ? null : trace.rootSpan.id,
    name: span.name,
    service,
    startTime: Math.max(0, span.startTime - trace.startTime),
    duration: span.durationMs ?? (span.endTime ? span.endTime - span.startTime : 0),
    status: span.status === 'error' ? 'error' : 'success',
    tags: Object.fromEntries(
      Object.entries(span.attributes ?? {}).map(([key, value]) => [key, String(value)])
    ),
  }));
};

interface BotWithStatus extends Bot {
  id: string;
  statusData: {
    status: string;
    connected: boolean;
    messageCount: number;
    errorCount: number;
    responseTime: number;
    uptime: number;
    lastActivity?: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: string;
  value: string;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <div className="p-6">{children}</div>}
  </div>
);

interface MonitoringDashboardProps {
  refreshInterval?: number;
  onRefresh?: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  refreshInterval: initialRefreshInterval = 30000,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState('health');
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<StatusResponse | null>(null);
  const [apiHealth, setApiHealth] = useState<{
    overall?: { status?: 'healthy' | 'warning' | 'error' };
    endpoints?: Array<{ responseTime?: number; averageResponseTime?: number }>;
  } | null>(null);
  const [configBots, setConfigBots] = useState<BotConfig[]>([]);
  const [bots, setBots] = useState<BotWithStatus[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval);
  const [traces, setTraces] = useState<PipelineTrace[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const { isConnected, botStats } = useWebSocket();
  const lastWsActivity = useRef<number>(0);

  // Track individual staleness
  const lastStatusUpdate = useRef<number>(0);
  const lastConfigUpdate = useRef<number>(0);

  const handleTabChange = (newValue: string) => {
    setActiveTab(newValue);
  };

  const fetchStatus = useCallback(async () => {
    setIsStatusLoading(true);
    try {
      const [systemResult, apiHealthResult] = await Promise.allSettled([
        apiService.getStatus(),
        // Same source as the Infrastructure Health panel below, so the
        // Ecosystem Status hero always agrees with it.
        apiService.getApiEndpointsStatus(),
      ]);
      if (systemResult.status === 'fulfilled') {
        setSystemMetrics(systemResult.value);
      }
      if (apiHealthResult.status === 'fulfilled' && apiHealthResult.value) {
        setApiHealth(apiHealthResult.value);
      }
      setLastRefresh(new Date());
      if (onRefresh) onRefresh();
    } catch (err) {
      debug('ERROR:', '[Monitoring] getStatus failed:', err);
    } finally {
      lastStatusUpdate.current = Date.now(); // Always update on completion to avoid retry loops
      setIsStatusLoading(false);
    }
  }, [onRefresh]);

  const fetchConfig = useCallback(async () => {
    setIsConfigLoading(true);
    try {
      // Read the same /api/bots source as the Bots page so the hero counts
      // include database-backed (and demo) bots, not just file-config bots.
      const rawBots: any = await apiService.getBots();
      const botsList: BotConfig[] = Array.isArray(rawBots) ? rawBots
        : Array.isArray(rawBots?.data) ? rawBots.data
        : rawBots?.data?.bots ?? rawBots?.bots ?? [];
      setConfigBots(botsList);
      setLastRefresh(new Date());
      if (onRefresh) onRefresh();
    } catch (err) {
      debug('ERROR:', '[Monitoring] getBots failed:', err);
    } finally {
      lastConfigUpdate.current = Date.now(); // Always update on completion to avoid retry loops
      setIsConfigLoading(false);
    }
  }, [onRefresh]);

  const fetchTraces = useCallback(async () => {
    try {
      const data = await apiService.getDecisionTraces();
      setTraces(Array.isArray(data?.traces) ? data.traces : []);
    } catch (err) {
      debug('ERROR:', '[Monitoring] getDecisionTraces failed:', err);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Manually triggered refresh ignores staleness
    fetchStatus();
    fetchConfig();
    fetchTraces();
  }, [fetchStatus, fetchConfig, fetchTraces]);

  // Memoize system metrics bot map for O(1) lookups
  const systemMetricsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (systemMetrics?.bots) {
      systemMetrics.bots.forEach((b: any) => {
        if (b.name) {
          map.set(b.name, b);
        }
      });
    }
    return map;
  }, [systemMetrics]);

  // Average latency from infrastructure health probes (always available once
  // /health/api-endpoints has been polled). Used as a real fallback so the
  // Response Time hero never shows N/A when the platform is healthy.
  const apiEndpointAvgMs = useMemo(() => {
    const endpoints = apiHealth?.endpoints || [];
    const samples = endpoints
      .map((e) => e.averageResponseTime || e.responseTime || 0)
      .filter((n) => n > 0);
    if (samples.length === 0) return 0;
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  }, [apiHealth]);

  // Derive bots with status combining /api/bots and system data independently.
  // The /api/bots payload already carries an honest status per bot; the
  // status endpoint only refines it when it has reported something.
  useEffect(() => {
    const botsWithStatus = configBots.map((bot: BotConfig) => {
      const statusBot = systemMetricsMap.get(bot.name);
      // Prefer per-bot measurements; fall back to infra probe avg so demo /
      // quiet fleets still show a meaningful Response Time KPI.
      const fleetAvg =
        Number((systemMetrics as { averageResponseTime?: number } | null)?.averageResponseTime) ||
        apiEndpointAvgMs ||
        0;
      const botLatency =
        Number((statusBot as { responseTime?: number } | undefined)?.responseTime) || fleetAvg || 0;
      return {
        ...bot,
        id: bot.name,
        statusData: statusBot ? {
          status: statusBot.status,
          connected: statusBot.connected || false,
          messageCount: statusBot.messageCount || 0,
          errorCount: statusBot.errorCount || 0,
          responseTime: botLatency,
          uptime: 0,
          lastActivity: undefined,
        } : {
          status: bot.status || 'unknown',
          connected: bot.connected || false,
          messageCount: bot.messageCount || 0,
          errorCount: bot.errorCount || 0,
          responseTime: botLatency,
          uptime: 0,
          lastActivity: undefined,
        },
      };
    });
    setBots(botsWithStatus);
  }, [configBots, systemMetricsMap, apiEndpointAvgMs, systemMetrics]);

  // Track WS activity so fallback poll knows when WS last delivered data
  useEffect(() => {
    if (botStats.length > 0) {
      lastWsActivity.current = Date.now();
      // Only consider status refreshed by WS if botStats is a reliable substitute.
      // Usually, WS updates the botStats but might not update the full config.
      // We will rely on independent tracking for fallback polls.
      lastStatusUpdate.current = Date.now();
    }
  }, [botStats]);

  // Initial load effect
  useEffect(() => {
    if (lastStatusUpdate.current === 0 && !isStatusLoading) {
      fetchStatus();
    }
    if (lastConfigUpdate.current === 0 && !isConfigLoading) {
      fetchConfig();
    }
  }, [fetchStatus, fetchConfig]); // purposefully omit loading flags to avoid retry loops

  // Fallback poll with independent per-endpoint staleness tracking
  useEffect(() => {
    const WS_STALE_MS = 60000; // consider data stale after 60s

    const interval = setInterval(() => {
      const now = Date.now();

      // Determine if endpoints are stale independently
      const isStatusStale = (now - lastStatusUpdate.current) >= WS_STALE_MS;
      const isConfigStale = (now - lastConfigUpdate.current) >= WS_STALE_MS;
      const wsStale = !isConnected || (now - lastWsActivity.current) >= WS_STALE_MS;

      // We only poll an endpoint if it is stale.
      // For status, it might be updated by WS, so check if WS is also stale.
      if (isStatusStale && wsStale && !isStatusLoading) {
        fetchStatus();
      }

      // Config is rarely updated by WS, so we rely on its own staleness tracking.
      if (isConfigStale && !isConfigLoading) {
        fetchConfig();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchConfig, refreshInterval, isConnected, isStatusLoading, isConfigLoading]);

  // Load real pipeline traces when the tracing tab is opened
  useEffect(() => {
    if (activeTab === 'tracing') {
      fetchTraces();
    }
  }, [activeTab, fetchTraces]);

  // Most recent trace first; the latest is selected by default
  const orderedTraces = useMemo(() => [...traces].sort((a, b) => b.startTime - a.startTime), [traces]);
  const selectedTrace = useMemo(
    () => orderedTraces.find((t) => t.traceId === selectedTraceId) ?? orderedTraces[0] ?? null,
    [orderedTraces, selectedTraceId],
  );
  const selectedTraceSpans = useMemo(
    () => (selectedTrace ? pipelineTraceToSpans(selectedTrace) : []),
    [selectedTrace],
  );

  // Ecosystem status agrees with the Infrastructure Health panel: it is the
  // worst of the API-endpoint health and the per-bot statuses. We only fall
  // back to "starting" when no health data of any kind has arrived yet --
  // never a literal "unknown" alongside healthy infrastructure data.
  const getOverallHealthStatus = () => {
    const apiStatus = apiHealth?.overall?.status;
    const hasBotError = bots.some(bot => bot.statusData?.status === 'error');
    const hasBotWarning = bots.some(bot => bot.statusData?.status === 'warning');

    if (apiStatus === 'error' || hasBotError) { return 'error'; }
    if (apiStatus === 'warning' || hasBotWarning) { return 'warning'; }

    const hasBotData = bots.some(
      bot => bot.statusData?.status && bot.statusData.status !== 'unknown',
    );
    if (apiStatus === 'healthy' || hasBotData) { return 'healthy'; }

    // No health or bot data yet (e.g. server still booting).
    return 'starting';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const overallStatus = getOverallHealthStatus();

  const monitoringTabs: TabItem[] = [
    { key: 'health', label: 'Infrastructure Health', icon: <Heart className="w-5 h-5" /> },
    { key: 'bots', label: 'Bot Status', icon: <Cpu className="w-5 h-5" /> },
    { key: 'activity', label: 'Activity Monitor', icon: <Clock className="w-5 h-5" /> },
    { key: 'tracing', label: 'Distributed Tracing', icon: <Activity className="w-5 h-5" /> },
  ];

  const stats = [
    {
      id: 'health',
      title: 'Ecosystem Status',
      value: overallStatus,
      icon: <Activity className="w-8 h-8" />,
      color: getHealthColor(overallStatus) as any,
    },
    {
      id: 'active',
      title: 'Active Bots',
      value: `${bots.filter(bot =>
        bot.statusData?.connected ||
        bot.statusData?.status === 'active' ||
        bot.statusData?.status === 'running',
      ).length}/${bots.length}`,
      description: 'Active / Total',
      icon: <Cpu className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'errors',
      title: 'Error Rate',
      value: `${bots.length > 0
        ? Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100)
        : 0}%`,
      description: 'Bots with errors',
      icon: <AlertTriangle className="w-8 h-8" />, // AlertTriangle needs import or use generic
      color: 'error' as const,
    },
    {
      id: 'latency',
      title: 'Response Time',
      // Prefer per-bot averages; fall back to fleet average from /status
      // (demo simulator / pipeline samples) then infrastructure probes.
      value: (() => {
        const samples = bots
          .map((bot) => bot.statusData?.responseTime || 0)
          .filter((n) => n > 0);
        if (samples.length > 0) {
          return `${Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)}ms`;
        }
        const fleet =
          Number((systemMetrics as { averageResponseTime?: number } | null)?.averageResponseTime) ||
          0;
        if (fleet > 0) return `${Math.round(fleet)}ms`;
        if (apiEndpointAvgMs > 0) return `${apiEndpointAvgMs}ms`;
        return 'N/A';
      })(),
      description: (() => {
        const hasBot = bots.some((bot) => (bot.statusData?.responseTime || 0) > 0);
        const fleet =
          Number((systemMetrics as { averageResponseTime?: number } | null)?.averageResponseTime) ||
          0;
        return hasBot || fleet > 0 || apiEndpointAvgMs > 0 ? 'Average' : 'No data recorded';
      })(),
      icon: <Clock className="w-8 h-8" />,
      color: 'secondary' as const,
    }
  ];

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <PageHeader
        title="System Monitoring"
        description={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
        icon={<ChartBar />}
        actions={
          <div className="flex items-center gap-2">
            <Select
              className="select-bordered"
              size="sm"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              aria-label="Refresh interval"
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
            </Select>
            <Button
              variant="secondary"
              className="btn-outline flex items-center gap-2"
              onClick={handleRefresh}
              disabled={isStatusLoading || isConfigLoading} aria-busy={isStatusLoading || isConfigLoading}
            >
              {(isStatusLoading || isConfigLoading) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      {/* Overall Health Summary */}
      <StatsCards stats={stats} isLoading={false} />

      {/* Tab Navigation */}
      <div className="bg-base-200 border-b border-base-300 rounded-t-lg">
        <Tabs
          tabs={monitoringTabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          variant="lifted"
          className="bg-transparent"
        />
      </div>

      {/* Tab Content */}
      <div className="bg-base-100 rounded-b-lg border border-t-0 border-base-200">
        <TabPanel value={activeTab} index="health">
          <SystemHealth refreshInterval={refreshInterval} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <MessageVolumeChart />
            </Suspense>
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <LLMUsageChart />
            </Suspense>
          </div>
        </TabPanel>

        <TabPanel value={activeTab} index="bots">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <BotStatusCard
                key={bot.id}
                bot={bot}
                statusData={bot.statusData}
                onRefresh={handleRefresh}
              />
            ))}
            {bots.length === 0 && (
              <Alert variant="info">
                No bots configured. Add bots through the Bot Manager to see status information.
              </Alert>
            )}
          </div>
        </TabPanel>

        <TabPanel value={activeTab} index="activity">
          <ActivityMonitor />
          <Suspense fallback={<LoadingSpinner size="lg" />}>
            <ActivityCharts />
          </Suspense>
        </TabPanel>

        <TabPanel value={activeTab} index="tracing">
          {orderedTraces.length === 0 ? (
            <Alert variant="info">
              No pipeline traces recorded yet. Traces appear here once messages flow through the
              processing pipeline.
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/70">Trace:</span>
                <Select
                  className="select-bordered"
                  size="sm"
                  value={selectedTrace?.traceId ?? ''}
                  onChange={(e) => setSelectedTraceId(e.target.value)}
                  aria-label="Select trace"
                >
                  {orderedTraces.map((trace) => (
                    <option key={trace.traceId} value={trace.traceId}>
                      {new Date(trace.startTime).toLocaleTimeString()} — {String(trace.rootSpan.attributes?.botName ?? 'pipeline')} ({trace.totalDurationMs ?? 0}ms)
                    </option>
                  ))}
                </Select>
              </div>
              <DistributedTraceWaterfall
                traceId={selectedTrace?.traceId ?? ''}
                spans={selectedTraceSpans}
                className="h-[600px] shadow-lg rounded-xl"
              />
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
