import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService, ActivityResponse } from '../services/api';
const MetricChart = lazy(() => import('../components/Monitoring/MetricChart'));
import StatsCards from '../components/DaisyUI/StatsCards';
import { useErrorToast } from '../components/DaisyUI/ToastNotification';
import Card from '../components/DaisyUI/Card';
import Select from '../components/DaisyUI/Select';
import DataTable from '../components/DaisyUI/DataTable';
import EmptyState from '../components/DaisyUI/EmptyState';
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
    cpuUsage: 0, memoryUsage: 0, activeConnections: 0, messageRate: 0, errorRate: 0, responseTime: 0,
  };

  // Process data for charts
  const events = activityData?.events || [];

  // Message Volume (from timeline or events)
  const messageVolumeData = activityData?.timeline?.map(bucket => ({
    timestamp: bucket.timestamp,
    value: Object.values(bucket.messageProviders ?? {}).reduce((a, b) => a + b, 0),
    label: 'Messages',
  })) || [];

  // Active Users (Unique count from events)
  const uniqueUsers = new Set(events.map(e => e.userId)).size;

  // Bot Performance Stats
  const botStats = (activityData?.agentMetrics ?? []).map(am => ({
    name: am.botName,
    messages: am.totalMessages,
    errors: am.errors,
    successRate: am.totalMessages > 0 ? ((am.totalMessages - am.errors) / am.totalMessages * 100).toFixed(1) : '100.0',
    events: am.events,
  })) || [];

  // Usage Metrics Cards
  const usageMetricsCards = [
    {
      id: 'total-messages',
      title: 'Total Messages',
      value: events.length.toLocaleString(),
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: uniqueUsers,
      icon: <Users className="w-8 h-8" />,
      color: 'secondary' as const,
    },
    {
      id: 'active-bots',
      title: 'Active Bots',
      value: activityData?.filters?.agents?.length ?? 0,
      icon: <Bot className="w-8 h-8" />,
      color: 'accent' as const,
    },
    {
      id: 'throughput',
      title: 'Throughput',
      value: `${currentMetric.messageRate.toFixed(1)}/s`,
      icon: <Activity className="w-8 h-8" />,
      color: 'info' as const,
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
              variant="ghost"
              size="sm"
              onClick={fetchAnalyticsData}
              loading={isLoading}
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Key Metrics */}
      <StatsCards stats={usageMetricsCards} isLoading={isLoading} />

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
        {/* Bot Performance */}
        <Card>
          <Card.Title tag="h3">Bot Performance</Card.Title>
          {botStats.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No bot activity"
              description="Bot activity will appear here once bots are processing messages."
              variant="noData"
            />
          ) : (
            <DataTable
              data={botStats}
              columns={[
                { key: 'name' as keyof typeof botStats[0], title: 'Bot Name', prominent: true },
                { key: 'messages' as keyof typeof botStats[0], title: 'Messages' },
                { key: 'errors' as keyof typeof botStats[0], title: 'Errors' },
                {
                  key: 'successRate' as keyof typeof botStats[0],
                  title: 'Success %',
                  render: (value: string) => (
                    <span className={parseFloat(value) > 98 ? 'text-success' : 'text-warning'}>
                      {value}%
                    </span>
                  ),
                },
              ]}
              rowKey={(bot: typeof botStats[0]) => bot.name}
              pagination={{ pageSize: 10 }}
            />
          )}
        </Card>

        {/* Real-time Event Stream */}
        <Card>
          <Card.Title tag="h3">Recent Activity</Card.Title>
          {validMessageFlow.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No recent activity"
              description="Events will appear here as your bots process messages."
              variant="noData"
            />
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {validMessageFlow.slice(0, 15).map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="flex items-center gap-3 p-2 rounded bg-base-200">
                  {event.messageType === 'incoming' ? (
                    <ArrowDown className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <ArrowUp className="w-5 h-5 text-success shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {event.botName ? `${event.botName} (${event.provider})` : event.provider}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-base-content/60">
                        {event.messageType === 'incoming' ? `User: ${event.userId}` : 'Response sent'}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bot Success/Error Summary */}
      {botStats.length > 0 && (
        <Card>
          <Card.Title tag="h3">Bot Success / Error Summary</Card.Title>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {botStats.map(stat => (
              <div key={stat.name} className="bg-base-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{stat.name}</span>
                  <span className={`text-xs font-medium ${parseFloat(stat.successRate) > 98 ? 'text-success' : 'text-warning'}`}>
                    {stat.successRate}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-base-content/60">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    {stat.messages - stat.errors}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-error" />
                    {stat.errors}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {stat.events} events
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
