import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import StatusCard from '../components/Monitoring/StatusCard';
import MetricChart from '../components/Monitoring/MetricChart';
import AlertPanel from '../components/Monitoring/AlertPanel';
import EventStream from '../components/Monitoring/EventStream';
import PerformanceMonitor from '../components/PerformanceMonitor';
import StatsCards from '../components/DaisyUI/StatsCards';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Alert } from '../components/DaisyUI/Alert';
import Select from '../components/DaisyUI/Select';
import {
  Activity,
  Server,
  Zap,
  Bell,
  Wifi,
  RefreshCw,
  Cpu,
  MemoryStick,
  Plug,
  TriangleAlert,
  Siren,
  AlertCircle,
  ArrowUp,
  MessageSquare,
} from 'lucide-react';

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
      <PageHeader
        title="Monitoring Dashboard"
        description="Real-time system monitoring and performance metrics"
        icon={Activity}
        gradient="primary"
        actions={
          <div className="flex gap-2 items-center">
            <span className={`text-sm ${isConnected ? 'text-success' : 'text-error'}`}>
              {isConnected ? '● Live' : '● Disconnected'}
            </span>
            <Select
              className="select-bordered select-sm"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </Select>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { disconnect(); connect(); }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Connection Error Alert */}
      {!isConnected && (
        <Alert status="error">
          <TriangleAlert className="w-5 h-5" />
          <span>WebSocket disconnected. Attempting to reconnect...</span>
        </Alert>
      )}

      {/* Status Cards */}
      <StatsCards stats={stats} />

      {/* System Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-base-100 rounded-box p-4 shadow">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" /> CPU Usage
          </h3>
          <div className="flex items-center gap-4">
            <div className="radial-progress text-primary text-sm font-bold" style={{ '--value': currentMetric.cpuUsage, '--size': '4rem', '--thickness': '0.3rem' } as React.CSSProperties} role="progressbar">
              {currentMetric.cpuUsage}%
            </div>
            <div className="text-sm text-base-content/70">
              <p>Current CPU load</p>
              <p className="text-xs text-base-content/50">Threshold: 80%</p>
            </div>
          </div>
        </div>

        <div className="bg-base-100 rounded-box p-4 shadow">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-secondary" /> Memory Usage
          </h3>
          <div className="flex items-center gap-4">
            <div className="radial-progress text-secondary text-sm font-bold" style={{ '--value': currentMetric.memoryUsage, '--size': '4rem', '--thickness': '0.3rem' } as React.CSSProperties} role="progressbar">
              {currentMetric.memoryUsage}%
            </div>
            <div className="text-sm text-base-content/70">
              <p>Current memory allocation</p>
              <p className="text-xs text-base-content/50">Threshold: 90%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricChart
          title="CPU Usage"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.cpuUsage,
            label: 'CPU',
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
            label: 'Memory',
          }))}
          type="line"
          color="var(--fallback-p,oklch(var(--p)/1))"
          unit="%"
          refreshInterval={refreshInterval}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricChart
          title="Message Rate"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.messageRate,
            label: 'Messages',
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
            label: 'Errors',
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
