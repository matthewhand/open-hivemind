/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Badge, Button, PageHeader, StatsCards, Alert } from '../DaisyUI';
import {
  Activity,
  BarChart2,
  Clock,
  Cpu,
  Heart,
  RefreshCw,
  Server,
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

      // Add status data to bots
      // In a real scenario, this status data would come from the API too
      // For now we map it from the status response if available, or generate mock data if not
      const botsWithStatus = configData.bots.map((bot: Bot) => {
        const botStatus = systemData.bots.find(b => b.name === bot.name);

        return {
          ...bot,
          id: bot.name,
          statusData: botStatus ? {
            status: botStatus.status,
            connected: botStatus.connected || false,
            messageCount: botStatus.messageCount || 0,
            errorCount: botStatus.errorCount || 0,
            responseTime: 100 + Math.random() * 200, // Mock if not in API
            uptime: systemData.uptime || 0,
            lastActivity: new Date().toISOString(), // Mock
          } : {
            status: 'unknown',
            connected: false,
            messageCount: 0,
            errorCount: 0,
            responseTime: 0,
            uptime: 0,
            lastActivity: new Date().toISOString(),
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
    default: return 'primary'; // changed from ghost to primary for StatsCards compatibility
    }
  };

  const overallStatus = getOverallHealthStatus();

  const tabs = [
    { icon: <Heart className="w-5 h-5" />, label: 'System Health' },
    { icon: <Cpu className="w-5 h-5" />, label: 'Bot Status' },
    { icon: <Clock className="w-5 h-5" />, label: 'Activity Monitor' },
  ];

  const stats = [
    {
      id: 'health',
      title: 'System Health',
      value: overallStatus.toUpperCase(),
      icon: <Heart className="w-8 h-8" />,
      color: getHealthColor(overallStatus) as any,
    },
    {
      id: 'bots',
      title: 'Active Bots',
      value: `${bots.filter(bot => bot.statusData?.connected).length}/${bots.length}`,
      description: 'Connected / Total',
      icon: <Server className="w-8 h-8" />,
      color: 'secondary' as const,
    },
    {
      id: 'errors',
      title: 'Error Rate',
      value: `${bots.length > 0 ? Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100) : 0}%`,
      description: 'Bots with errors',
      icon: <Activity className="w-8 h-8" />,
      color: 'error' as const,
    },
    {
      id: 'latency',
      title: 'Avg Response',
      value: `${bots.length > 0 ? Math.round(bots.reduce((acc, bot) => acc + (bot.statusData?.responseTime || 0), 0) / bots.length) : 0}ms`,
      description: 'System Latency',
      icon: <Zap className="w-8 h-8" />,
      color: 'warning' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        description={`Real-time system status and metrics (Updated: ${lastRefresh.toLocaleTimeString()})`}
        icon={BarChart2}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={getHealthColor(overallStatus) as any} size="lg">
              {overallStatus.toUpperCase()}
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

      {/* Tab Navigation */}
      <div className="bg-base-100 rounded-lg shadow-sm border border-base-200">
        <div className="border-b border-base-200 bg-base-200/50">
          <div role="tablist" className="tabs tabs-lifted tabs-lg">
            {tabs.map((tab, index) => (
              <a
                key={index}
                role="tab"
                className={`tab gap-2 ${activeTab === index ? 'tab-active font-bold bg-base-100 border-b-base-100' : ''}`}
                onClick={() => handleTabChange(index)}
              >
                {tab.icon}
                {tab.label}
              </a>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-base-100 rounded-b-lg min-h-[400px]">
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
              {bots.length === 0 && !loading && (
                <div className="col-span-full">
                   <Alert variant="info" icon={<Server className="w-5 h-5"/>}>
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
