/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Alert, Button, Loading, PageHeader, StatsCards } from '../DaisyUI';
import {
  RefreshCw,
  BarChart2,
  Heart,
  Cpu,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  AlertCircle
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

      // Merge status data with bots
      // In a real scenario, statusData would come from the backend linked to bot IDs
      // For now, we simulate or map it if available
      const botsWithStatus = configData.bots.map((bot: Bot) => {
        const status = systemData.bots.find(b => b.name === bot.name);
        return {
          ...bot,
          id: bot.name,
          statusData: status ? {
             status: status.status,
             connected: status.connected || false,
             messageCount: status.messageCount || 0,
             errorCount: status.errorCount || 0,
             responseTime: 0, // Not provided by status endpoint yet
             uptime: 0,
             lastActivity: new Date().toISOString()
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
    default: return 'info'; // 'ghost' is not valid for stats card color usually
    }
  };

  const overallStatus = getOverallHealthStatus();

  const tabs = [
    { icon: <Heart className="w-5 h-5" />, label: 'System Health' },
    { icon: <Cpu className="w-5 h-5" />, label: 'Bot Status' },
    { icon: <Clock className="w-5 h-5" />, label: 'Activity Monitor' },
  ];

  // Stats for StatsCards
  const stats = [
    {
      id: 'health',
      title: 'System Health',
      value: overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1),
      icon: overallStatus === 'healthy' ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />,
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
      value: bots.length > 0
        ? `${Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100)}%`
        : '0%',
      description: 'Bots with errors',
      icon: <AlertCircle className="w-8 h-8" />,
      color: 'error' as const,
    },
    // We don't have response time in basic status endpoint, skipping or mocking
    {
      id: 'uptime',
      title: 'System Uptime',
      value: systemMetrics?.uptime ? `${Math.floor(systemMetrics.uptime / 3600)}h` : 'N/A',
      description: 'Since last restart',
      icon: <Clock className="w-8 h-8" />,
      color: 'secondary' as const,
    }
  ];

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title="System Monitoring"
        description={`Real-time system status and health metrics. Last updated: ${lastRefresh.toLocaleTimeString()}`}
        icon={BarChart2}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      {/* Overall Health Summary */}
      <StatsCards stats={stats} isLoading={loading && !systemMetrics} />

      {/* Tab Navigation */}
      <div className="bg-base-100 rounded-box shadow-sm border border-base-200">
        <div role="tablist" className="tabs tabs-boxed bg-transparent p-2">
          {tabs.map((tab, index) => (
            <a
              key={index}
              role="tab"
              className={`tab gap-2 h-10 transition-all duration-200 ${activeTab === index ? 'tab-active shadow-sm font-medium' : 'hover:bg-base-200/50'}`}
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
              <div className="col-span-full">
                 <Alert variant="info" icon={<Activity className="w-5 h-5"/>}>
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
  );
};

export default MonitoringDashboard;
