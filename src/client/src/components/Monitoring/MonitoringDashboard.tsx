import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import { Alert } from '../DaisyUI/Alert';
import Button from '../DaisyUI/Button';
import PageHeader from '../DaisyUI/PageHeader';
import StatsCards from '../DaisyUI/StatsCards';
import {
  Activity,
  RotateCcw,
  Heart,
  Cpu,
  Clock,
  ChartBar,
  AlertTriangle,
} from 'lucide-react';
import SystemHealth from '../SystemHealth';
import BotStatusCard from '../BotStatusCard';
import ActivityMonitor from './ActivityMonitor';
import ActivityCharts from './ActivityCharts';
import DistributedTraceWaterfall, { TraceSpan } from './DistributedTraceWaterfall';
import BotActivityWaterfallMonitor from './BotActivityWaterfallMonitor';
import { apiService } from '../../services/api';
import type { StatusResponse, Bot } from '../../services/api';
import Debug from 'debug';
const debug = Debug('app:client:components:Monitoring:MonitoringDashboard');

const mockSpans: TraceSpan[] = [
  {
    id: 'trace-req-8f9d3b2a',
    parentId: null,
    name: 'POST /api/v1/chat/completions',
    service: 'api-gateway',
    startTime: 0,
    duration: 1245.5,
    status: 'success',
    tags: { 'http.status_code': '200', 'client.id': 'app-mobile-1' }
  },
  {
    id: 'span-auth-11',
    parentId: 'trace-req-8f9d3b2a',
    name: 'authenticateRequest',
    service: 'auth-service',
    startTime: 5.2,
    duration: 45.1,
    status: 'success',
    tags: { 'user.id': 'usr_99823' }
  },
  {
    id: 'span-db-12',
    parentId: 'span-auth-11',
    name: 'querySessionToken',
    service: 'database',
    startTime: 8.5,
    duration: 38.0,
    status: 'success',
    tags: { 'db.query': 'SELECT * FROM sessions WHERE token = ?' }
  },
  {
    id: 'span-bot-20',
    parentId: 'trace-req-8f9d3b2a',
    name: 'processChatLogic',
    service: 'bot-core',
    startTime: 55.0,
    duration: 1180.2,
    status: 'success'
  },
  {
    id: 'span-llm-30',
    parentId: 'span-bot-20',
    name: 'generateResponse',
    service: 'llm-provider',
    startTime: 60.5,
    duration: 1050.8,
    status: 'success',
    tags: { 'model': 'gpt-4', 'tokens.prompt': '145', 'tokens.completion': '280' }
  },
  {
    id: 'span-ext-api-40',
    parentId: 'span-bot-20',
    name: 'fetchUserData',
    service: 'external-api',
    startTime: 1120.0,
    duration: 65.0,
    status: 'error',
    tags: { 'http.url': 'https://api.crm.local/users/99823' },
    logs: ['Connection timeout after 60ms', 'Retrying... failed']
  }
];


interface BotWithStatus extends Bot {
  id: string;
  statusData: {
    status: string;
    connected: boolean;
    messageCount: number;
    errorCount: number;
    responseTime: number;
    uptime: number;
    lastActivity: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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
  const [activeTab, setActiveTab] = useState(0);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<StatusResponse | null>(null);
  const [configBots, setConfigBots] = useState<Bot[]>([]);
  const [bots, setBots] = useState<BotWithStatus[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval);
  const { isConnected, botStats } = useWebSocket();
  const lastWsActivity = useRef<number>(0);

  // Track individual staleness
  const lastStatusUpdate = useRef<number>(0);
  const lastConfigUpdate = useRef<number>(0);

  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
  };

  const fetchStatus = useCallback(async () => {
    setIsStatusLoading(true);
    try {
      const systemData = await apiService.getStatus();
      setSystemMetrics(systemData);
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
      const configData = await apiService.getConfig();
      setConfigBots(configData.bots || []);
      setLastRefresh(new Date());
      if (onRefresh) onRefresh();
    } catch (err) {
      debug('ERROR:', '[Monitoring] getConfig failed:', err);
    } finally {
      lastConfigUpdate.current = Date.now(); // Always update on completion to avoid retry loops
      setIsConfigLoading(false);
    }
  }, [onRefresh]);

  const handleRefresh = useCallback(() => {
    // Manually triggered refresh ignores staleness
    fetchStatus();
    fetchConfig();
  }, [fetchStatus, fetchConfig]);

  // Derive bots with status combining config and system data independently
  useEffect(() => {
    const botsWithStatus = configBots.map((bot: Bot) => {
      const statusBot = systemMetrics?.bots?.find((b: any) => b.name === bot.name);
      return {
        ...bot,
        id: bot.name,
        statusData: statusBot ? {
          status: statusBot.status,
          connected: statusBot.connected || false,
          messageCount: statusBot.messageCount || 0,
          errorCount: statusBot.errorCount || 0,
          responseTime: 0, // Not in StatusResponse
          uptime: 0, // Not in StatusResponse
          lastActivity: new Date().toISOString(),
        } : {
          status: 'healthy',
          connected: true,
          messageCount: Math.floor(Math.random() * 100),
          errorCount: Math.floor(Math.random() * 5),
          responseTime: Math.floor(Math.random() * 500) + 100,
          uptime: Math.floor(Math.random() * 86400),
          lastActivity: new Date().toISOString(),
        },
      };
    });
    setBots(botsWithStatus);
  }, [configBots, systemMetrics]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const getOverallHealthStatus = () => {
    if (!bots.length) { return 'unknown'; }

    const botHealthIssues = bots.filter(bot =>
      bot.statusData?.status === 'error' || bot.statusData?.status === 'warning',
    ).length;

    if (botHealthIssues > 0) {
      const hasError = bots.some(bot => bot.statusData?.status === 'error');
      return hasError ? 'error' : 'warning';
    }
    return 'healthy';
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

  const tabs = [
    { icon: <Heart className="w-5 h-5" />, label: 'Infrastructure Health' },
    { icon: <Cpu className="w-5 h-5" />, label: 'Bot Status' },
    { icon: <Clock className="w-5 h-5" />, label: 'Activity Monitor' },
    { icon: <Activity className="w-5 h-5" />, label: 'Distributed Tracing' },
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
      value: `${bots.filter(bot => bot.statusData?.connected).length}/${bots.length}`,
      description: 'Connected / Total',
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
      value: `${bots.length > 0
        ? Math.round(bots.reduce((acc, bot) => acc + (bot.statusData?.responseTime || 0), 0) / bots.length)
        : 0}ms`,
      description: 'Average',
      icon: <Clock className="w-8 h-8" />,
      color: 'secondary' as const,
    }
  ];

  // Need to import AlertTriangle
  // Added AlertTriangle to imports in the file block above (I'll need to make sure it's actually there)

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <PageHeader
        title="System Monitoring"
        description={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
        icon={<ChartBar />}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={30000}>30 seconds</option>
              <option value={60000}>1 minute</option>
              <option value={300000}>5 minutes</option>
            </select>
            <Button
              variant="secondary"
              className="btn-outline flex items-center gap-2"
              onClick={handleRefresh}
              disabled={isStatusLoading || isConfigLoading} aria-busy={isStatusLoading || isConfigLoading}
            >
              {(isStatusLoading || isConfigLoading) ? (
                <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
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
        <div role="tablist" className="tabs tabs-boxed bg-transparent">
          {tabs.map((tab, index) => (
            <a
              key={index}
              role="tab"
              className={`tab gap-2 ${activeTab === index ? 'tab-active' : ''}`}
              onClick={() => handleTabChange(index)}
            >
              {tab.icon}
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-base-100 rounded-b-lg border border-t-0 border-base-200">
        <TabPanel value={activeTab} index={0}>
          <SystemHealth refreshInterval={refreshInterval} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
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

        <TabPanel value={activeTab} index={2}>
          <ActivityMonitor />
          <ActivityCharts />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <DistributedTraceWaterfall traceId="trace-req-8f9d3b2a" spans={mockSpans} className="h-[600px] shadow-lg rounded-xl" />
        </TabPanel>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
