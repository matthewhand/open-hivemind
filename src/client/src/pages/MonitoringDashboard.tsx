/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService, SystemErrorsResponse, SystemRecoveryResponse } from '../services/api';
import StatusCard from '../components/Monitoring/StatusCard';
import MetricChart from '../components/Monitoring/MetricChart';
import AlertPanel from '../components/Monitoring/AlertPanel';
import EventStream from '../components/Monitoring/EventStream';
import { ShieldCheckIcon, ShieldExclamationIcon, LightBulbIcon, ExclamationTriangleIcon, HeartIcon } from '@heroicons/react/24/outline';

const MonitoringDashboard: React.FC = () => {
  const { isConnected, connect, disconnect, performanceMetrics, alerts } = useWebSocket();
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [isLoading, setIsLoading] = useState(false);

  // New state for enhanced diagnostics
  const [recoveryStats, setRecoveryStats] = useState<SystemRecoveryResponse | null>(null);
  const [errorStats, setErrorStats] = useState<SystemErrorsResponse | null>(null);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const [recovery, errors] = await Promise.all([
        apiService.getSystemRecovery(),
        apiService.getSystemErrors()
      ]);
      setRecoveryStats(recovery);
      setErrorStats(errors);
    } catch (err) {
      console.error('Failed to fetch system diagnostics:', err);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, refreshInterval * 2); // Poll less frequently than metrics
    return () => clearInterval(interval);
  }, [fetchDiagnostics, refreshInterval]);

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
        { label: 'CPU Load', value: Number(currentMetric.cpuUsage || 0).toFixed(1), unit: '%' },
        { label: 'Memory', value: Number(currentMetric.memoryUsage || 0).toFixed(1), unit: '%' },
        { label: 'Active', value: Number(currentMetric.activeConnections || 0), icon: '🔌' }
      ]
    },
    {
      title: 'Message Throughput',
      subtitle: 'Traffic Analysis',
      status: 'healthy',
      metrics: [
        { label: 'Rate', value: Number(currentMetric.messageRate || 0).toFixed(1), unit: '/sec' },
        { label: 'Latency', value: Number(currentMetric.responseTime || 0).toFixed(0), unit: 'ms' },
        { label: 'Errors', value: Number(currentMetric.errorRate || 0).toFixed(2), unit: '%' }
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

  const safeNumber = (val: any) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
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

      {/* System Diagnostics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recovery Status Panel */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-secondary" />
              System Recovery Status
            </h2>
            <div className="stats shadow w-full mt-4">
              <div className="stat">
                <div className="stat-title">Health</div>
                <div className={`stat-value text-lg ${recoveryStats?.health?.status === 'healthy' ? 'text-success' : 'text-warning'}`}>
                  {String(recoveryStats?.health?.status || 'UNKNOWN').toUpperCase()}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Circuit Breakers</div>
                <div className="stat-value text-lg">
                  {safeNumber(recoveryStats?.circuitBreakers?.length)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Open Circuits</div>
                <div className="stat-value text-lg text-error">
                  {safeNumber(recoveryStats?.circuitBreakers?.filter(cb => cb.state === 'open').length)}
                </div>
              </div>
            </div>

            {recoveryStats?.health?.recommendations && recoveryStats.health.recommendations.length > 0 && (
               <div className="alert alert-warning mt-4 text-sm py-2">
                 <ExclamationTriangleIcon className="w-5 h-5" />
                 <div>
                   <h3 className="font-bold">Recommendations</h3>
                   <ul className="list-disc pl-4">
                     {recoveryStats.health.recommendations.map((rec, i) => <li key={i}>{String(rec)}</li>)}
                   </ul>
                 </div>
               </div>
            )}

            <div className="overflow-x-auto mt-4">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>State</th>
                    <th>Failures</th>
                    <th>Successes</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryStats?.circuitBreakers?.map((cb, idx) => (
                    <tr key={idx}>
                      <td className="font-mono">{String(cb.operation)}</td>
                      <td>
                        <span className={`badge badge-sm ${cb.state === 'closed' ? 'badge-success' : cb.state === 'open' ? 'badge-error' : 'badge-warning'}`}>
                          {String(cb.state)}
                        </span>
                      </td>
                      <td>{safeNumber(cb.failureCount)}</td>
                      <td>{safeNumber(cb.successCount)}</td>
                    </tr>
                  )) || <tr><td colSpan={4} className="text-center opacity-50">Loading recovery stats...</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Error Intelligence Panel */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <LightBulbIcon className="w-6 h-6 text-accent" />
              Error Intelligence
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-2">
               <div className="bg-base-200 rounded-lg p-3">
                 <div className="text-xs opacity-70">Error Rate (1m)</div>
                 <div className="text-xl font-bold">{safeNumber(errorStats?.errors?.rate).toFixed(2)} / sec</div>
               </div>
               <div className="bg-base-200 rounded-lg p-3">
                 <div className="text-xs opacity-70">Total Errors</div>
                 <div className="text-xl font-bold">{safeNumber(errorStats?.errors?.total)}</div>
               </div>
            </div>

            {errorStats?.health?.recommendations && errorStats.health.recommendations.length > 0 && (
               <div className="alert alert-info mt-4 text-sm py-2">
                 <LightBulbIcon className="w-5 h-5" />
                 <div>
                   <h3 className="font-bold">System Insights</h3>
                   <ul className="list-disc pl-4">
                     {errorStats.health.recommendations.map((rec, i) => <li key={i}>{String(rec)}</li>)}
                   </ul>
                 </div>
               </div>
            )}

            <h3 className="font-semibold mt-4 text-sm">Top Error Types</h3>
            <div className="space-y-2 mt-2">
              {Object.entries(errorStats?.errors?.byType || {}).slice(0, 5).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="font-mono bg-base-200 px-1 rounded">{String(type)}</span>
                  <div className="flex items-center gap-2 w-1/2">
                    <progress className="progress progress-error w-full" value={safeNumber(count)} max={safeNumber(errorStats?.errors?.total || 1)}></progress>
                    <span className="w-8 text-right">{safeNumber(count)}</span>
                  </div>
                </div>
              ))}
              {(!errorStats || Object.keys(errorStats.errors?.byType || {}).length === 0) && (
                <div className="text-center opacity-50 py-4 text-sm">No errors recorded recently.</div>
              )}
            </div>
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