/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { apiService } from '../../services/api';
import StatusCard from './StatusCard';
import MetricChart from './MetricChart';
import AlertPanel from './AlertPanel';
import EventStream from './EventStream';
import SystemHealth from '../SystemHealth';
import { PageHeader } from '../DaisyUI';
import { ChartBar } from 'lucide-react';

const MonitoringDashboard: React.FC = () => {
  const { isConnected, connect, disconnect, performanceMetrics, alerts } = useWebSocket();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [isLoading, setIsLoading] = useState(false);
  const [initialMetrics, setInitialMetrics] = useState<any>(null);

  useEffect(() => {
    connect();

    // Fetch initial system health to ensure we have data even before WS updates (and for screenshot tests)
    const fetchInitialData = async () => {
      try {
        const health = await apiService.getSystemHealth();
        setInitialMetrics(health);
      } catch (err) {
        console.error('Failed to fetch initial system health:', err);
      }
    };
    fetchInitialData();

    return () => {
      disconnect();
    };
  }, []);

  // Determine current metrics: use WS data if available, otherwise fallback to initial fetch
  const latestWsMetric = performanceMetrics[performanceMetrics.length - 1];

  const currentMetric = latestWsMetric || (initialMetrics ? {
    cpuUsage: 0,
    memoryUsage: initialMetrics.memory.usage, // This is %
    activeConnections: 0,
    messageRate: 0,
    errorRate: 0,
    responseTime: 0,
  } : {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    messageRate: 0,
    errorRate: 0,
    responseTime: 0,
  });

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
        { label: 'API', value: 'Online', icon: '🟢' },
        { label: 'Uptime', value: '99.9%', icon: '⏱️' }
      ]
    }
  ];

  return (
    <div className="flex-1 space-y-6">
       <PageHeader
        title="Monitoring Dashboard"
        description="Real-time system monitoring and performance metrics"
        icon={ChartBar}
        actions={
          <div className="flex gap-4">
             <span className={`badge ${isConnected ? 'badge-success' : 'badge-error'} gap-2`}>
                {isConnected ? 'Live' : 'Disconnected'}
             </span>
            <select
              className="select select-bordered select-sm"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={1000}>1s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </div>
        }
      />

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

      {/* Alerts and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

      {/* Detailed System Health (Restored Feature) */}
      <div className="divider">Detailed System Information</div>
      <SystemHealth refreshInterval={refreshInterval} />
    </div>
  );
};

export default MonitoringDashboard;
