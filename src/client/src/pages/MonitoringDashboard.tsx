import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import StatusCard from '../components/Monitoring/StatusCard';
import MetricChart from '../components/Monitoring/MetricChart';
import AlertPanel from '../components/Monitoring/AlertPanel';
import EventStream from '../components/Monitoring/EventStream';

const MonitoringDashboard: React.FC = () => {
  const { isConnected, connect, disconnect, performanceMetrics, alerts } = useWebSocket();
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    connect();
    fetchSystemData();

    const interval = setInterval(() => {
      fetchSystemData();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      disconnect();
    };
  }, [refreshInterval]);

  const fetchSystemData = async () => {
    try {
      const [status, health] = await Promise.all([
        apiService.getStatus(),
        apiService.getSystemHealth()
      ]);
      setSystemStatus(status);
      setSystemMetrics(health);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
      setIsLoading(false);
    }
  };

  // Mock data for demonstration
  const mockSystemMetrics = {
    cpu: { user: 25, system: 15, total: 40 },
    memory: { used: 6.2, total: 16, usage: 39 },
    disk: { used: 125, total: 500, usage: 25 },
    network: { rx: 1024, tx: 2048 }
  };

  const metrics = systemMetrics || mockSystemMetrics;

  const statusCards = [
    {
      title: 'System Health',
      subtitle: 'Overall system status',
      status: systemStatus?.bots?.some(b => b.status === 'error') ? 'error' :
              systemStatus?.bots?.some(b => b.status === 'warning') ? 'warning' : 'healthy',
      metrics: [
        { label: 'CPU Usage', value: metrics.cpu?.total || 0, unit: '%', trend: 'stable' },
        { label: 'Memory', value: metrics.memory?.usage || 0, unit: '%', trend: 'up', trendValue: 5 },
        { label: 'Disk', value: metrics.disk?.usage || 0, unit: '%', trend: 'stable' },
        { label: 'Uptime', value: systemStatus?.uptime || 0, unit: 's', icon: '⏱️' }
      ],
      refreshInterval: 5000,
      onRefresh: fetchSystemData,
      isLoading
    },
    {
      title: 'Bot Status',
      subtitle: 'Connected bots and activity',
      status: systemStatus?.bots?.some(b => b.status === 'error') ? 'error' : 'healthy',
      metrics: [
        { label: 'Total Bots', value: systemStatus?.bots?.length || 0, icon: '🤖' },
        { label: 'Active', value: systemStatus?.bots?.filter(b => b.status === 'online')?.length || 0, icon: '✅' },
        { label: 'Errors', value: systemStatus?.bots?.filter(b => b.status === 'error')?.length || 0, icon: '❌' },
        { label: 'Messages', value: systemStatus?.bots?.reduce((acc, b) => acc + (b.messageCount || 0), 0) || 0, icon: '💬' }
      ],
      refreshInterval: 10000,
      onRefresh: fetchSystemData,
      isLoading
    },
    {
      title: 'Performance',
      subtitle: 'System performance metrics',
      status: metrics.cpu?.total > 80 ? 'error' : metrics.cpu?.total > 60 ? 'warning' : 'healthy',
      metrics: [
        { label: 'Response Time', value: 125, unit: 'ms', trend: 'down', trendValue: -8 },
        { label: 'Throughput', value: 1024, unit: 'req/s', trend: 'up', trendValue: 12 },
        { label: 'Error Rate', value: 0.5, unit: '%', trend: 'stable' },
        { label: 'Queue Size', value: 42, unit: 'items', trend: 'down', trendValue: -15 }
      ],
      refreshInterval: 5000,
      onRefresh: fetchSystemData,
      isLoading
    },
    {
      title: 'Network',
      subtitle: 'Network traffic and status',
      status: 'healthy',
      metrics: [
        { label: 'Incoming', value: (metrics.network?.rx || 0) / 1024, unit: 'KB/s', trend: 'up', trendValue: 23 },
        { label: 'Outgoing', value: (metrics.network?.tx || 0) / 1024, unit: 'KB/s', trend: 'stable' },
        { label: 'Connections', value: 156, icon: '🔗' },
        { label: 'Latency', value: 12, unit: 'ms', trend: 'down', trendValue: -5 }
      ],
      refreshInterval: 3000,
      onRefresh: fetchSystemData,
      isLoading
    }
  ];

  // Generate sample chart data
  const generateChartData = (baseValue: number, variance: number = 10) => {
    const now = new Date();
    return Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (19 - i) * 60000).toISOString(),
      value: baseValue + (Math.random() - 0.5) * variance
    }));
  };

  return (
    <div className="min-h-screen bg-base-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Monitoring Dashboard</h1>
            <p className="text-lg text-neutral-content/70">
              Real-time system monitoring and performance metrics
              {isConnected ? (
                <span className="text-success ml-2">● Live</span>
              ) : (
                <span className="text-error ml-2">● Disconnected</span>
              )}
            </p>
          </div>
          <div className="flex gap-4">
            <select
              className="select select-bordered"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={fetchSystemData}
              disabled={isLoading}
            >
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : '🔄'} Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statusCards.map((card, index) => (
          <StatusCard
            key={index}
            title={card.title}
            subtitle={card.subtitle}
            status={card.status}
            metrics={card.metrics}
            refreshInterval={card.refreshInterval}
            onRefresh={card.onRefresh}
            isLoading={card.isLoading}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="CPU Usage"
          data={generateChartData(metrics.cpu?.total || 40)}
          type="area"
          color="#ef4444"
          unit="%"
          refreshInterval={5000}
          onRefresh={fetchSystemData}
        />
        <MetricChart
          title="Memory Usage"
          data={generateChartData(metrics.memory?.usage || 39)}
          type="line"
          color="#3b82f6"
          unit="%"
          refreshInterval={5000}
          onRefresh={fetchSystemData}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="Network Traffic"
          data={generateChartData(1024, 200)}
          type="bar"
          color="#10b981"
          unit="KB/s"
          refreshInterval={3000}
          onRefresh={fetchSystemData}
        />
        <MetricChart
          title="Response Time"
          data={generateChartData(125, 25)}
          type="line"
          color="#f59e0b"
          unit="ms"
          refreshInterval={5000}
          onRefresh={fetchSystemData}
        />
      </div>

      {/* Alerts and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertPanel
          alerts={alerts.map((alert, index) => ({
            id: alert.id || `alert-${index}`,
            type: alert.severity as any || 'info',
            title: alert.title || 'System Alert',
            message: alert.message || '',
            timestamp: alert.timestamp || new Date().toISOString(),
            source: alert.source || 'System',
            metadata: alert.metadata
          }))}
          onAcknowledge={(id) => console.log('Acknowledged alert:', id)}
          onResolve={(id) => console.log('Resolved alert:', id)}
          onDismiss={(id) => console.log('Dismissed alert:', id)}
          maxAlerts={10}
        />
        <EventStream
          maxEvents={20}
          showFilters={true}
          autoScroll={true}
          onEventClick={(event) => console.log('Event clicked:', event)}
        />
      </div>
    </div>
  );
};

export default MonitoringDashboard;