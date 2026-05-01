import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Bell, Server, Wifi, Zap } from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
const MetricChart = lazy(() => import('../components/Monitoring/MetricChart'));
import AlertPanel from '../components/Monitoring/AlertPanel';
import EventStream from '../components/Monitoring/EventStream';
import PerformanceMonitor from '../components/PerformanceMonitor';
import Select from '../components/DaisyUI/Select';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import Debug from 'debug';
const debug = Debug('app:client:pages:MonitoringDashboard');

const MonitoringDashboard: React.FC = () => {
  const { isConnected, connect, disconnect, performanceMetrics, alerts } = useWebSocket();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    connect();
    setIsLoading(false);
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect, disconnect]);

  const currentMetric = performanceMetrics[performanceMetrics.length - 1] || {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    messageRate: 0,
    errorRate: 0,
    responseTime: 0,
  };

  const stats = [
    {
      id: 'system-health',
      title: 'System Health',
      value: alerts.some(a => a.level === 'error' || a.level === 'critical') ? 'Warning' : 'Healthy',
      icon: <Server className="w-8 h-8" />,
      color: (alerts.some(a => a.level === 'error' || a.level === 'critical') ? 'warning' : 'success') as const,
    },
    {
      id: 'message-throughput',
      title: 'Message Rate',
      value: `${currentMetric.messageRate}/s`,
      icon: <Zap className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'active-alerts',
      title: 'Active Alerts',
      value: alerts.length,
      icon: <Bell className="w-8 h-8" />,
      color: (alerts.length > 0 ? 'warning' : 'success') as const,
    },
    {
      id: 'connection-status',
      title: 'WebSocket',
      value: isConnected ? 'Connected' : 'Disconnected',
      icon: <Wifi className="w-8 h-8" />,
      color: (isConnected ? 'success' : 'error') as const,
    },
  ];

  if (isLoading) {
    return <SkeletonPage statsCount={4} />;
  }

  return (
    <div className="space-y-6">
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
            <Select
              className="select-bordered"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="CPU Usage"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.cpuUsage,
            label: 'CPU'
          }))}
          type="area"
          color="var(--fallback-er,oklch(var(--er)/1))"
          unit="%"
          refreshInterval={refreshInterval}
        />
        <MetricChart
          title="Memory Usage"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.memoryUsage,
            label: 'Memory'
          }))}
          type="line"
          color="var(--fallback-p,oklch(var(--p)/1))"
          unit="%"
          refreshInterval={refreshInterval}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="Message Rate"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.messageRate,
            label: 'Messages'
          }))}
          type="bar"
          color="var(--fallback-su,oklch(var(--su)/1))"
          unit="msgs/sec"
          refreshInterval={refreshInterval}
        />
        <MetricChart
          title="Error Rate"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.errorRate,
            label: 'Errors'
          }))}
          type="line"
          color="var(--fallback-wa,oklch(var(--wa)/1))"
          unit="%"
          refreshInterval={refreshInterval}
        />
      </div>

      {/* Performance Monitor */}
      <PerformanceMonitor />

      {/* Alerts and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertPanel
          alerts={alerts.map((alert, index) => ({
            id: alert.id || `alert-${index}`,
            type: (alert.level === 'critical' ? 'error' : alert.level) || 'info',
            title: alert.title || 'System Alert',
            message: alert.message || '',
            timestamp: alert.timestamp || new Date().toISOString(),
            source: 'System',
            metadata: alert.metadata,
          }))}
          onAcknowledge={(id) => { /* handled by AlertPanel */ }}
          onResolve={(id) => { /* handled by AlertPanel */ }}
          onDismiss={(id) => { /* handled by AlertPanel */ }}
          maxAlerts={10}
        />
        <EventStream
          maxEvents={20}
          showFilters={true}
          autoScroll={true}
          onEventClick={() => { /* handled by EventStream */ }}
        />
      </div>
    </div>
  );
};

export default MonitoringDashboard;
