/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Alert, Button, Loading, PageHeader, StatsCards } from '../DaisyUI';
import {
  RefreshCw,
  LayoutDashboard,
  Activity,
  Server,
  Cpu,
  Clock,
  Heart,
  AlertTriangle,
  Zap,
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
  <div role="tabpanel" hidden={value !== index} className="animate-fade-in">
    {value === index && <div className="p-6">{children}</div>}
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
      // Add mock status data to bots for demonstration (keeping original logic for now)
      const botsWithStatus = configData.bots.map((bot: Bot) => ({
        ...bot,
        id: bot.name,
        statusData: {
          status: 'healthy',
          connected: true,
          messageCount: Math.floor(Math.random() * 100),
          errorCount: Math.floor(Math.random() * 5),
          responseTime: Math.floor(Math.random() * 500) + 100,
          uptime: Math.floor(Math.random() * 86400),
          lastActivity: new Date().toISOString(),
        },
      }));
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

  const overallStatus = getOverallHealthStatus();

  const getHealthColor = (status: string) => {
    switch (status) {
    case 'healthy': return 'success';
    case 'warning': return 'warning';
    case 'error': return 'error';
    default: return 'info';
    }
  };

  const stats = [
    {
      id: 'system-health',
      title: 'System Health',
      value: overallStatus,
      icon: <Heart className="w-8 h-8" />,
      color: getHealthColor(overallStatus) as any,
    },
    {
      id: 'active-bots',
      title: 'Active Bots',
      value: `${bots.filter(bot => bot.statusData?.connected).length}/${bots.length}`,
      description: 'Connected / Total',
      icon: <Cpu className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      value: `${bots.length > 0
        ? Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100)
        : 0}%`,
      description: 'Bots with errors',
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'error' as const,
    },
    {
      id: 'response-time',
      title: 'Avg Response',
      value: `${bots.length > 0
        ? Math.round(bots.reduce((acc, bot) => acc + (bot.statusData?.responseTime || 0), 0) / bots.length)
        : 0}ms`,
      description: 'Average latency',
      icon: <Zap className="w-8 h-8" />,
      color: 'warning' as const,
    }
  ];

  const tabs = [
    { icon: <Activity className="w-4 h-4" />, label: 'System Health' },
    { icon: <Server className="w-4 h-4" />, label: 'Bot Status' },
    { icon: <Clock className="w-4 h-4" />, label: 'Activity Monitor' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="System Monitoring Dashboard"
        description={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="btn-outline flex items-center gap-2"
              onClick={handleRefresh}
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={loading && !systemMetrics} />

      {/* Tab Navigation */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="border-b border-base-200 bg-base-200/50 p-2">
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
        <div className="bg-base-100 min-h-[400px]">
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
                    <div className="col-span-full">
                         <Alert variant="info" icon={<AlertTriangle className="w-5 h-5"/>}>
                            No bots configured. Add bots through the Bot Manager to see status information.
                        </Alert>
                    </div>
                )}
                </div>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
                <ActivityMonitor />
            </TabPanel>
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
