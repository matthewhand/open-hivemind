import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService, ActivityResponse } from '../services/api';
import MetricChart from '../components/Monitoring/MetricChart';
import StatusCard from '../components/Monitoring/StatusCard';
import { redactString } from '../utils/redaction';
import DataTable from '../components/DaisyUI/DataTable';
import PageHeader from '../components/DaisyUI/PageHeader';
import Button from '../components/DaisyUI/Button';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import Card from '../components/DaisyUI/Card';
import Select from '../components/DaisyUI/Select';

const AnalyticsDashboard: React.FC = () => {
  const { messageFlow, performanceMetrics } = useWebSocket();
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
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
    } catch (_error) {
      errorToast('Analytics Error', 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

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
    },
    {
      title: 'User Engagement',
      subtitle: 'Active participants',
      status: 'healthy',
      metrics: [
        { label: 'Active Users', value: uniqueUsers, icon: '👥' },
        { label: 'Active Bots', value: activityData?.filters?.agents?.length ?? 0, icon: '🤖' },
      ]
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
    },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-6">
      {/* Header */}
      <PageHeader
        title="Analytics Dashboard"
        description="Usage metrics, user engagement, and performance analytics."
        icon={BarChart3}
        gradient="secondary"
        actions={
          <div className="flex gap-4">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { label: 'Last Hour', value: '1h' },
                { label: 'Last 24 Hours', value: '24h' },
                { label: 'Last 7 Days', value: '7d' },
                { label: 'Last 30 Days', value: '30d' },
              ]}
              className="w-auto"
            />
            <Button
              variant="primary"
              onClick={fetchAnalyticsData}
              loading={isLoading}
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {usageMetricsCards.map((card, index) => (
          <StatusCard
            key={index}
            title={card.title}
            subtitle={card.subtitle}
            status={card.status as any}
            metrics={card.metrics}
            compact={true}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="Message Volume"
          data={messageVolumeData}
          type="area"
          color="var(--fallback-p,oklch(var(--p)/1))"
          unit="msgs"
          height={350}
        />
        <MetricChart
          title="Response Time (Live)"
          data={performanceMetrics.map(m => ({
            timestamp: m.timestamp,
            value: m.responseTime,
            label: 'Latency'
          }))}
          type="line"
          color="var(--fallback-er,oklch(var(--er)/1))"
          unit="ms"
          height={350}
        />
      </div>

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl" title="Bot Performance">
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
                    <span className={parseFloat(value) > 98 ? 'text-success' : 'text-warning'}>
                      {value}%
                    </span>
                  ),
                },
              ]}
              rowKey={(bot: any) => bot.name}
              emptyState={<p className="text-center text-base-content/50 py-4">No bot activity found</p>}
            />
        </Card>

        {/* Real-time Event Stream */}
        <Card className="shadow-xl" title="Recent Activity Stream">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validMessageFlow.slice(0, 10).map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="flex items-center gap-3 p-2 rounded bg-base-200">
                  <span className="text-2xl">
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
                      <span className="text-xs text-base-content/60">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {validMessageFlow.length === 0 && (
                <p className="text-center text-base-content/50 py-4">No recent activity</p>
              )}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;