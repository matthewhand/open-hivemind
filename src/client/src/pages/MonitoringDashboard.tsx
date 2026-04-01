import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import StatusCard from '../components/Monitoring/StatusCard';
import MetricChart from '../components/Monitoring/MetricChart';
import AlertPanel from '../components/Monitoring/AlertPanel';
import EventStream from '../components/Monitoring/EventStream';
import PerformanceMonitor from '../components/PerformanceMonitor';
import Debug from 'debug';
const debug = Debug('app:client:pages:MonitoringDashboard');

const MonitoringDashboard: React.FC = () => {
  const { isConnected, connect, disconnect, performanceMetrics, alerts } = useWebSocket();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [_isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    connect();
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

  const statusCards = [
    {
      title: 'System Health',
      subtitle: 'Overall Status',
      status: alerts.some(a => a.level === 'error' || a.level === 'critical') ? 'warning' : 'healthy',
      metrics: [
        { label: 'CPU Load', value: currentMetric.cpuUsage, unit: '%' },
        { label: 'Memory', value: currentMetric.memoryUsage, unit: '%' },
        { label: 'Active', value: currentMetric.activeConnections, icon: '🔌' }
      ]
    },
    {
      title: 'Message Throughput',
      subtitle: 'Traffic Analysis',
      status: 'healthy',
      metrics: [
        { label: 'Rate', value: currentMetric.messageRate, unit: '/sec' },
        { label: 'Latency', value: currentMetric.responseTime, unit: 'ms' },
        { label: 'Errors', value: currentMetric.errorRate, unit: '%' }
      ]
    },
    {
      title: 'Active Alerts',
      subtitle: 'System Notifications',
      status: alerts.length > 0 ? 'warning' : 'healthy',
      metrics: [
        { label: 'Total', value: alerts.length, icon: '🔔' },
        { label: 'Critical', value: alerts.filter(a => a.level === 'critical').length, icon: '🚨' },
        { label: 'Warning', value: alerts.filter(a => a.level === 'warning').length, icon: '⚠️' }
      ]
    },
    {
      title: 'Connection Status',
      subtitle: 'WebSocket & API',
      status: isConnected ? 'healthy' : 'error',
      metrics: [
        { label: 'WebSocket', value: isConnected ? 'Connected' : 'Disconnected', icon: isConnected ? '🟢' : '🔴' },
        { label: 'API', value: 'Online', icon: '🟢' }, // detailed status could be fetched separately
        { label: 'Uptime', value: '99.9%', icon: '⏱️' }
      ]
    }
  ];

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
            status={card.status as any}
            metrics={card.metrics}
            refreshInterval={refreshInterval}
            isLoading={isLoading}
          />
        ))}
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
          color="#ef4444"
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
          color="#3b82f6"
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
          color="#10b981"
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
          color="#f59e0b"
          unit="%"
          refreshInterval={refreshInterval}
        />
      </div>

      {/* Performance Monitor */}
      <div className="mb-8">
        <PerformanceMonitor />
      </div>

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
          onAcknowledge={(id) => debug('Acknowledged alert:', id)}
          onResolve={(id) => debug('Resolved alert:', id)}
          onDismiss={(id) => debug('Dismissed alert:', id)}
          maxAlerts={10}
        />
        <EventStream
          maxEvents={20}
          showFilters={true}
          autoScroll={true}
          onEventClick={(event) => debug('Event clicked:', event)}
        />
      </div>
    </div>
  );
};

export default MonitoringDashboard;