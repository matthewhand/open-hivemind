/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService, ActivityResponse } from '../services/api';
import MetricChart from '../components/Monitoring/MetricChart';
import StatusCard from '../components/Monitoring/StatusCard';
import { redactString } from '../utils/redaction';
import DataTable from '../components/DaisyUI/DataTable';
import Tooltip from '../components/DaisyUI/Tooltip';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import { Info, Download, Calendar } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  const { messageFlow, performanceMetrics } = useWebSocket();
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const errorToast = useErrorToast();

  // Filter message flow for valid timestamps
  const validMessageFlow = messageFlow.filter(e => e && e.timestamp);

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate from date based on range
      const now = new Date();
      const from = new Date();
      if (timeRange === '1h') { from.setHours(now.getHours() - 1); }
      else if (timeRange === '24h') { from.setHours(now.getHours() - 24); }
      else if (timeRange === '7d') { from.setDate(now.getDate() - 7); }
      else if (timeRange === '30d') { from.setDate(now.getDate() - 30); }

      const data = await apiService.getActivity({
        from: from.toISOString(),
      });
      setActivityData(data);
    } catch (error) {
      errorToast('Analytics Error', 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Keyboard shortcuts for time range selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey) {
        switch(event.key) {
          case 'H':
            setTimeRange('1h');
            event.preventDefault();
            break;
          case 'D':
            setTimeRange('24h');
            event.preventDefault();
            break;
          case 'W':
            setTimeRange('7d');
            event.preventDefault();
            break;
          case 'M':
            setTimeRange('30d');
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const currentMetric = performanceMetrics[performanceMetrics.length - 1] || {
    cpuUsage: 0, memoryUsage: 0, activeConnections: 0, messageRate: 0, errorRate: 0, responseTime: 0
  };

  // Process data for charts
  const events = activityData?.events || [];

  // Message Volume (from timeline or events)
  const messageVolumeData = activityData?.timeline?.map(bucket => ({
    timestamp: bucket.timestamp,
    value: Object.values(bucket.messageProviders ?? {}).reduce((a, b) => a + b, 0),
    label: 'Messages'
  })) || [];

  // Active Users (Unique count from events)
  const uniqueUsers = new Set(events.map(e => e.userId)).size;

  // Bot Performance Stats
  const botStats = (activityData?.agentMetrics ?? []).map(am => ({
    name: am.botName,
    messages: am.totalMessages,
    errors: am.errors,
    successRate: am.totalMessages > 0 ? ((am.totalMessages - am.errors) / am.totalMessages * 100).toFixed(1) : '100.0',
    avgResponse: am.events > 0 ? Math.round(Math.random() * 100 + 50) : 0 // Mocking response time per bot as it's not in agentMetrics yet
  })) || [];

  // Export analytics data
  const handleExport = async () => {
    if (!activityData) return;

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const headers = ['Metric', 'Value'];
      const rows = [
        ['Time Range', timeRange],
        ['Total Messages', events.length.toString()],
        ['Active Users', uniqueUsers.toString()],
        ['Active Bots', (activityData?.filters?.agents?.length ?? 0).toString()],
        ['Message Rate', currentMetric.messageRate.toFixed(1) + '/s'],
        ['Error Rate', currentMetric.errorRate.toFixed(2) + '%'],
        ['Avg Response Time', currentMetric.responseTime + 'ms'],
        ['Availability', (100 - currentMetric.errorRate).toFixed(1) + '%'],
      ];

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics_export_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Usage Metrics Cards
  const usageMetricsCards = [
    {
      title: 'Total Messages',
      subtitle: 'In selected range',
      status: 'healthy',
      metrics: [
        { label: 'Messages', value: events.length.toLocaleString(), icon: '💬' },
        { label: 'Throughput', value: currentMetric.messageRate.toFixed(1), unit: '/s' },
        { label: 'Errors', value: (activityData?.agentMetrics ?? []).reduce((acc, m) => acc + (m.errors ?? 0), 0), icon: '❌' },
      ],
      description: 'Total messages processed across all bots and providers in the selected time period',
    },
    {
      title: 'User Engagement',
      subtitle: 'Active participants',
      status: 'healthy',
      metrics: [
        { label: 'Active Users', value: uniqueUsers, icon: '👥' },
        { label: 'Active Bots', value: activityData?.filters?.agents?.length ?? 0, icon: '🤖' },
      ],
      description: 'Unique users who have interacted with bots and the number of active bot instances',
    },
    {
      title: 'System Health',
      subtitle: 'Performance',
      status: currentMetric.errorRate > 2 ? 'warning' : 'healthy',
      metrics: [
        { label: 'Availability', value: (100 - currentMetric.errorRate).toFixed(1), unit: '%' },
        { label: 'Latency', value: currentMetric.responseTime, unit: 'ms' },
        { label: 'Connections', value: currentMetric.activeConnections, icon: '🔗' },
      ],
      description: 'System uptime, average response latency, and active WebSocket connections',
    },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-6">
      {/* WIP Banner */}
      <div role="alert" className="alert alert-info mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>This feature is in preview mode. Historical data availability may be limited as we improve our data retention capabilities.</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              Analytics Dashboard
            </h1>
            <p className="text-lg text-neutral-content/70">
              Usage metrics, user engagement, and performance analytics.
            </p>
          </div>
          <div className="flex gap-4">
            <Tooltip content="Select time range for analytics (Alt+Shift+H/D/W/M)" position="left">
              <select
                className="select select-bordered"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                aria-label="Time range selector"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </Tooltip>
            <Tooltip content="Export analytics data to CSV" position="left">
              <button
                className="btn btn-secondary"
                onClick={handleExport}
                disabled={isExporting || !activityData}
                aria-label="Export analytics data"
              >
                {isExporting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" aria-hidden="true"></span> Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Export
                  </>
                )}
              </button>
            </Tooltip>
            <Tooltip content="Refresh analytics data" position="left">
              <button
                className="btn btn-primary"
                onClick={fetchAnalyticsData}
                disabled={isLoading}
                aria-label="Refresh analytics"
              >
                {isLoading ? <span className="loading loading-spinner loading-sm" aria-hidden="true"></span> : '🔄'} Refresh
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="alert alert-info text-sm mb-6">
        <Info className="w-4 h-4" aria-hidden="true" />
        <span>
          <strong>Keyboard shortcuts:</strong> Alt+Shift+H (1 hour), D (24 hours), W (7 days), M (30 days)
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {usageMetricsCards.map((card, index) => (
          <Tooltip key={index} content={card.description} position="top">
            <div>
              <StatusCard
                title={
                  <div className="flex items-center gap-2">
                    {card.title}
                    <Info className="w-3 h-3 text-base-content/40" aria-hidden="true" />
                  </div>
                }
                subtitle={card.subtitle}
                status={card.status as any}
                metrics={card.metrics}
                compact={true}
              />
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Tooltip content="Total number of messages processed over time" position="top">
          <div>
            <MetricChart
              title="Message Volume"
              data={messageVolumeData}
              type="area"
              color="#8b5cf6"
              unit="msgs"
              height={350}
            />
          </div>
        </Tooltip>
        <Tooltip content="Real-time response latency showing system performance" position="top">
          <div>
            <MetricChart
              title="Response Time (Live)"
              data={performanceMetrics.map(m => ({
                timestamp: m.timestamp,
                value: m.responseTime,
                label: 'Latency'
              }))}
              type="line"
              color="#ef4444"
              unit="ms"
              height={350}
            />
          </div>
        </Tooltip>
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <Tooltip content="Performance breakdown by bot showing message counts, errors, and success rates" position="top">
              <h2 className="card-title mb-4 flex items-center gap-2">
                Bot Performance
                <Info className="w-4 h-4 text-base-content/40" aria-hidden="true" />
              </h2>
            </Tooltip>
            {botStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg font-medium text-base-content/70 mb-2">No bot activity yet</p>
                <p className="text-sm text-base-content/50">
                  Bot performance metrics will appear here once your bots start processing messages.
                </p>
              </div>
            ) : (
              <DataTable
                data={botStats}
                columns={[
                  { key: 'name' as any, title: 'Bot Name', prominent: true },
                  { key: 'messages' as any, title: 'Messages' },
                  { key: 'errors' as any, title: 'Errors' },
                  {
                    key: 'successRate' as any,
                    title: 'Success %',
                    render: (value: string) => (
                      <span className={`text-${parseFloat(value) > 98 ? 'success' : 'warning'}`}>
                        {value}%
                      </span>
                    ),
                  },
                ]}
                rowKey={(bot: any) => bot.name}
                emptyState={<p className="text-center text-neutral-content/50 py-4">No bot activity found</p>}
              />
            )}
          </div>
        </div>

        {/* Real-time Event Stream */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <Tooltip content="Live stream of recent bot activity and message events" position="top">
              <h2 className="card-title mb-4 flex items-center gap-2">
                Recent Activity Stream
                <Info className="w-4 h-4 text-base-content/40" aria-hidden="true" />
              </h2>
            </Tooltip>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validMessageFlow.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg font-medium text-base-content/70 mb-2">No recent activity</p>
                  <p className="text-sm text-base-content/50">
                    Messages will appear here in real-time as they are processed. Try sending a message to one of your bots to see activity.
                  </p>
                </div>
              ) : (
                validMessageFlow.slice(0, 10).map((event, idx) => (
                  <div key={`${event.timestamp}-${idx}`} className="flex items-center gap-3 p-2 rounded bg-base-200">
                    <span className="text-2xl" aria-hidden="true">
                      {event.messageType === 'incoming' ? '📥' : '📤'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {event.botName ? `${event.botName} (${event.provider})` : event.provider}
                      </p>
                      <div className="flex justify-between">
                        <span className="text-xs opacity-70">
                          {event.messageType === 'incoming' ? `User: ${redactString(event.userId)}` : 'Response sent'}
                        </span>
                        <span className="text-xs text-neutral-content/60">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
