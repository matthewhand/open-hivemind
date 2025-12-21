import React, { useState, useEffect } from 'react';
import { Card, Badge, Alert, Button, Loading } from '../DaisyUI';
import {
  ArrowPathIcon,
  ChartBarIcon,
  HeartIcon,
  CpuChipIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
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
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <div className="p-6">{children}</div>}
  </div>
);

interface MonitoringDashboardProps {
  refreshInterval?: number;
  onRefresh?: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  refreshInterval = 30000,
  onRefresh
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
        apiService.getConfig()
      ]);

      setSystemMetrics(systemData);
      // Add mock status data to bots for demonstration
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
          lastActivity: new Date().toISOString()
        }
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
    if (!systemMetrics || !bots.length) return 'unknown';

    // Derive system health from StatusResponse data
    const systemHealth = systemMetrics.bots.some(bot => bot.status === 'error') ? 'error' :
      systemMetrics.bots.some(bot => bot.status === 'warning') ? 'warning' : 'healthy';

    const botHealthIssues = bots.filter(bot =>
      bot.statusData?.status === 'error' || bot.statusData?.status === 'warning'
    ).length;

    if (systemHealth === 'error' || botHealthIssues > 0) return 'error';
    if (systemHealth === 'warning' || botHealthIssues > 0) return 'warning';
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

  const tabs = [
    { icon: <HeartIcon className="w-5 h-5" />, label: 'System Health' },
    { icon: <CpuChipIcon className="w-5 h-5" />, label: 'Bot Status' },
    { icon: <ClockIcon className="w-5 h-5" />, label: 'Activity Monitor' },
  ];

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="bg-base-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6" />
            <h1 className="text-xl font-bold">System Monitoring Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant={getHealthColor(overallStatus) as any} size="lg">
              Overall: {overallStatus}
            </Badge>
            <span className="text-sm text-base-content/70">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <Button
              variant="secondary" className="btn-outline"
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <ArrowPathIcon className="w-5 h-5" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Health Summary */}
      <div className="p-6 bg-base-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <Card.Body>
              <p className="text-base-content/70 text-sm mb-2">
                System Health
              </p>
              <h2 className="text-3xl font-bold mb-2">
                {getOverallHealthStatus()}
              </h2>
              <Badge variant={getHealthColor(getOverallHealthStatus()) as any} size="sm">
                {getOverallHealthStatus()}
              </Badge>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <p className="text-base-content/70 text-sm mb-2">
                Active Bots
              </p>
              <h2 className="text-3xl font-bold mb-2">
                {bots.filter(bot => bot.statusData?.connected).length}/{bots.length}
              </h2>
              <p className="text-sm text-base-content/70">
                Connected / Total
              </p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <p className="text-base-content/70 text-sm mb-2">
                Error Rate
              </p>
              <h2 className="text-3xl font-bold mb-2">
                {bots.length > 0
                  ? Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100)
                  : 0}%
              </h2>
              <p className="text-sm text-base-content/70">
                Bots with errors
              </p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <p className="text-base-content/70 text-sm mb-2">
                Response Time
              </p>
              <h2 className="text-3xl font-bold mb-2">
                {bots.length > 0
                  ? Math.round(bots.reduce((acc, bot) => acc + (bot.statusData?.responseTime || 0), 0) / bots.length)
                  : 0}ms
              </h2>
              <p className="text-sm text-base-content/70">
                Average
              </p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-base-200 border-b border-base-300">
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
        <ActivityMonitor refreshInterval={refreshInterval} />
      </TabPanel>
    </div>
  );
};

export default MonitoringDashboard;