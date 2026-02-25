/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Badge, Alert, Button, PageHeader, StatsCards } from '../DaisyUI';
import {
  RefreshCw,
  BarChart,
  Heart,
  Cpu,
  Clock,
  Activity,
  Bot as BotIcon
} from 'lucide-react';
import SystemHealth from '../SystemHealth';
import BotStatusCard from '../BotStatusCard';
import ActivityMonitor from '../ActivityMonitor';
import { apiService } from '../../services/api';
import type { StatusResponse, Bot } from '../../services/api';

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
  <div role="tabpanel" hidden={value !== index} className={value === index ? "animate-fade-in" : ""}>
    {value === index && <div className="mt-6">{children}</div>}
  </div>
);

interface MonitoringDashboardProps {
  refreshInterval?: number;
  onRefresh?: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  refreshInterval = 30000,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<StatusResponse | null>(null);
  const [bots, setBots] = useState<BotWithStatus[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Refresh all monitoring data
      const [systemData, configData] = await Promise.all([
        apiService.getStatus(),
        apiService.getConfig(),
      ]);

      setSystemMetrics(systemData);

      // Merge config and status data
      const botsWithStatus = configData.bots.map((bot: Bot) => {
        const status = systemData.bots.find(s => s.name === bot.name);
        return {
          ...bot,
          id: bot.name,
          statusData: {
            status: status?.status || 'unknown',
            connected: status?.connected || false,
            messageCount: status?.messageCount || 0,
            errorCount: status?.errorCount || 0,
            responseTime: (status as any)?.responseTime || 0,
            uptime: (status as any)?.uptime || 0,
            lastActivity: (status as any)?.lastActivity || '',
            healthDetails: status?.healthDetails
          },
        };
      });
      setBots(botsWithStatus);
      setLastRefresh(new Date());

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getOverallHealthStatus = () => {
    if (!systemMetrics || !bots.length) {return 'unknown';}

    // Derive system health from StatusResponse data
    const systemHealth = systemMetrics.bots.some(bot => bot.status === 'error') ? 'error' :
      systemMetrics.bots.some(bot => bot.status === 'warning') ? 'warning' : 'healthy';

    const botHealthIssues = bots.filter(bot =>
      bot.statusData?.status === 'error' || bot.statusData?.status === 'warning',
    ).length;

    if (systemHealth === 'error' || botHealthIssues > 0) {return 'error';}
    if (systemHealth === 'warning' || botHealthIssues > 0) {return 'warning';}
    return 'healthy';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
    case 'healthy': return 'success';
    case 'warning': return 'warning';
    case 'error': return 'error';
    default: return 'ghost';
    }
  };

  const overallStatus = getOverallHealthStatus();

  const stats = [
    {
        id: 'health',
        title: 'System Health',
        value: getOverallHealthStatus().toUpperCase(),
        icon: <Heart className="w-8 h-8" />,
        color: getHealthColor(getOverallHealthStatus()) as any
    },
    {
        id: 'active-bots',
        title: 'Active Bots',
        value: `${bots.filter(bot => bot.statusData?.connected).length}/${bots.length}`,
        description: 'Connected / Total',
        icon: <BotIcon className="w-8 h-8" />,
        color: 'primary' as const
    },
    {
        id: 'error-rate',
        title: 'Error Rate',
        value: `${bots.length > 0
                  ? Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100)
                  : 0}%`,
        description: 'Bots with errors',
        icon: <Activity className="w-8 h-8" />,
        color: 'error' as const
    },
    {
        id: 'response-time',
        title: 'Avg Response',
        value: `${bots.length > 0
                  ? Math.round(bots.reduce((acc, bot) => acc + (bot.statusData?.responseTime || 0), 0) / bots.length)
                  : 0}ms`,
        icon: <Clock className="w-8 h-8" />,
        color: 'secondary' as const
    }
  ];

  const tabs = [
    { icon: <Heart className="w-4 h-4" />, label: 'System Health' },
    { icon: <Cpu className="w-4 h-4" />, label: 'Bot Status' },
    { icon: <Clock className="w-4 h-4" />, label: 'Activity Monitor' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        description={`Real-time system performance and bot status. Last updated: ${lastRefresh.toLocaleTimeString()}`}
        icon={BarChart}
        actions={
            <div className="flex items-center gap-2">
                 <Badge variant={getHealthColor(overallStatus) as any} size="lg" className="uppercase font-bold">
                    {overallStatus}
                 </Badge>
                 <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
        }
      />

      <StatsCards stats={stats} isLoading={loading && !systemMetrics} />

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 rounded-box inline-flex">
        {tabs.map((tab, index) => (
          <a
            key={index}
            role="tab"
            className={`tab gap-2 transition-all duration-200 ${activeTab === index ? 'tab-active font-bold shadow-sm' : 'hover:bg-base-300/50'}`}
            onClick={() => handleTabChange(index)}
          >
            {tab.icon}
            {tab.label}
          </a>
        ))}
      </div>

      {/* Tab Content */}
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
      </TabPanel>
    </div>
  );
};

export default MonitoringDashboard;