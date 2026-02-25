/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Badge, Button, PageHeader, StatsCards } from '../DaisyUI';
import {
  RefreshCw,
  Activity,
  Heart,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
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
  <div role="tabpanel" className={value !== index ? 'hidden' : ''}>
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

      // Map bots and merge with status data if available in systemData
      // Note: In a real scenario, systemData.bots should match configData.bots
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
            responseTime: 0, // Not provided in StatusResponse currently
            uptime: 0, // Not provided in StatusResponse currently
            lastActivity: new Date().toISOString(), // Mock for now
            healthDetails: botStatus.healthDetails
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
    if (!systemMetrics || !bots.length) { return 'unknown'; }

    // Derive system health from StatusResponse data
    const systemHealth = systemMetrics.bots.some(bot => bot.status === 'error') ? 'error' :
      systemMetrics.bots.some(bot => bot.status === 'warning') ? 'warning' : 'healthy';

    const botHealthIssues = bots.filter(bot =>
      bot.statusData?.status === 'error' || bot.statusData?.status === 'warning',
    ).length;

    if (systemHealth === 'error' || botHealthIssues > 0) { return 'error'; }
    if (systemHealth === 'warning' || botHealthIssues > 0) { return 'warning'; }
    return 'healthy';
  };

  const overallStatus = getOverallHealthStatus();

  const getHealthIcon = (status: string) => {
      switch(status) {
          case 'healthy': return <CheckCircle className="w-8 h-8 text-success" />;
          case 'warning': return <AlertTriangle className="w-8 h-8 text-warning" />;
          case 'error': return <XCircle className="w-8 h-8 text-error" />;
          default: return <Activity className="w-8 h-8 text-neutral" />;
      }
  };

  const stats = [
    {
      id: 'system-health',
      title: 'System Health',
      value: overallStatus, // This will be displayed as string
      icon: getHealthIcon(overallStatus),
      color: overallStatus === 'healthy' ? 'success' : overallStatus === 'warning' ? 'warning' : 'error',
    },
    {
      id: 'active-bots',
      title: 'Active Bots',
      value: bots.filter(bot => bot.statusData?.connected).length,
      icon: <Cpu className="w-8 h-8" />,
      color: 'primary',
      description: `${bots.length} Total Bots`
    },
    {
      id: 'error-rate',
      title: 'Bots with Errors',
      value: bots.filter(bot => bot.statusData?.status === 'error').length,
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'error',
      description: 'Requiring Attention'
    },
    {
      id: 'avg-response',
      title: 'Avg Response',
      value: 'Wait...', // Placeholder as we don't have this data easily yet
      icon: <Clock className="w-8 h-8" />,
      color: 'info',
    }
  ];

  // Update stats with calculated values
  const responseTimes = bots.map(b => b.statusData?.responseTime || 0).filter(t => t > 0);
  const avgResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  stats[3].value = `${avgResponse}ms`;

  const tabs = [
    { icon: <Heart className="w-4 h-4" />, label: 'System Health' },
    { icon: <Cpu className="w-4 h-4" />, label: 'Bot Status' },
    { icon: <Activity className="w-4 h-4" />, label: 'Activity Monitor' },
  ];

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="System Monitoring"
        description={`Real-time status dashboard. Last updated: ${lastRefresh.toLocaleTimeString()}`}
        icon={Activity}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={overallStatus === 'healthy' ? 'success' : overallStatus === 'warning' ? 'warning' : 'error' as any} size="lg">
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

      <StatsCards stats={stats as any} isLoading={loading && !systemMetrics} />

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 w-fit">
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

      <div className="bg-base-100 rounded-box border border-base-200 min-h-[400px]">
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
                <div className="col-span-full flex justify-center py-12">
                    <p className="text-base-content/60">No bots configured.</p>
                </div>
            )}
            </div>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
            <ActivityMonitor />
        </TabPanel>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
