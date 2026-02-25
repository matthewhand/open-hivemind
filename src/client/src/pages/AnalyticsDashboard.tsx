/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService, ActivityResponse, ActivityEvent } from '../services/api';
import MetricChart from '../components/Monitoring/MetricChart';
import {
  Alert,
  PageHeader,
  StatsCards,
  DataTable,
  Button,
  Select,
  Card,
  EmptyState
} from '../components/DaisyUI';
import {
  BarChart,
  RefreshCw,
  MessageCircle,
  Users,
  Activity,
  ArrowRight,
  ArrowLeft,
  Bot
} from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  const { messageFlow, performanceMetrics } = useWebSocket();
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);

  // Filter message flow for valid timestamps
  const validMessageFlow = messageFlow.filter(e => e && e.timestamp);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
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
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentMetric = performanceMetrics[performanceMetrics.length - 1] || {
    cpuUsage: 0, memoryUsage: 0, activeConnections: 0, messageRate: 0, errorRate: 0, responseTime: 0
  };

  // Process data for charts
  const events = activityData?.events || [];

  // Message Volume (from timeline or events)
  const messageVolumeData = activityData?.timeline?.map(bucket => ({
    timestamp: bucket.timestamp,
    value: Object.values(bucket.messageProviders).reduce((a, b) => a + b, 0),
    label: 'Messages'
  })) || [];

  // Active Users (Unique count from events)
  const uniqueUsers = new Set(events.map(e => e.userId)).size;

  // Bot Performance Stats
  const botStats = activityData?.agentMetrics?.map(am => ({
    name: am.botName,
    messages: am.totalMessages,
    errors: am.errors,
    successRate: am.totalMessages > 0 ? ((am.totalMessages - am.errors) / am.totalMessages * 100).toFixed(1) + '%' : '100.0%',
    provider: am.messageProvider,
    llm: am.llmProvider
  })) || [];

  // Usage Metrics Cards
  const stats = [
    {
      id: 'total-messages',
      title: 'Total Messages',
      value: events.length,
      icon: <MessageCircle className="w-8 h-8" />,
      color: 'primary' as const,
      description: 'In selected range',
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: uniqueUsers,
      icon: <Users className="w-8 h-8" />,
      color: 'secondary' as const,
      description: 'Unique participants',
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      value: `${currentMetric.errorRate.toFixed(1)}%`,
      icon: <Activity className="w-8 h-8" />,
      color: currentMetric.errorRate > 5 ? 'error' as const : 'success' as const,
      description: 'Current system error rate',
    },
    {
      id: 'active-bots',
      title: 'Active Bots',
      value: activityData?.filters.agents.length || 0,
      icon: <Bot className="w-8 h-8" />,
      color: 'accent' as const,
    }
  ];

  const columns = [
    {
      key: 'name',
      title: 'Bot Name',
      sortable: true,
      render: (value: string) => <span className="font-medium">{value}</span>
    },
    {
      key: 'messages',
      title: 'Messages',
      sortable: true,
    },
    {
      key: 'errors',
      title: 'Errors',
      sortable: true,
      render: (value: number) => value > 0 ? <span className="text-error font-bold">{value}</span> : <span className="text-base-content/50">0</span>
    },
    {
      key: 'successRate',
      title: 'Success Rate',
      sortable: true,
      render: (value: string) => {
        const rate = parseFloat(value);
        return (
          <span className={rate > 98 ? 'text-success' : rate > 90 ? 'text-warning' : 'text-error'}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'provider',
      title: 'Platform',
      render: (value: string) => <span className="badge badge-ghost badge-sm">{value}</span>
    },
    {
      key: 'llm',
      title: 'LLM',
      render: (value: string) => <span className="badge badge-outline badge-sm">{value}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <Alert
        status="info"
        message="This feature is in preview mode. Historical data availability may be limited as we improve our data retention capabilities."
      />

      <PageHeader
        title="Analytics Dashboard"
        description="Usage metrics, user engagement, and performance analytics."
        icon={BarChart}
        actions={
          <div className="flex gap-2">
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={[
                { value: '1h', label: 'Last Hour' },
                { value: '24h', label: 'Last 24 Hours' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ]}
              className="select-sm w-40"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAnalyticsData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        }
      />

      <StatsCards stats={stats} isLoading={isLoading && !activityData} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricChart
          title="Message Volume"
          data={messageVolumeData}
          type="area"
          color="#8b5cf6"
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
          color="#ef4444"
          unit="ms"
          height={350}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Performance Stats */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="h-full bg-base-100">
            <div className="card-body p-0">
              <div className="p-4 border-b border-base-200">
                <h2 className="card-title text-lg">Bot Performance</h2>
              </div>
              {botStats.length > 0 ? (
                <DataTable
                  data={botStats}
                  columns={columns}
                  pagination={{ pageSize: 5 }}
                  searchable={false}
                  className="p-4"
                />
              ) : (
                <div className="p-8">
                  <EmptyState
                    title="No Bot Data"
                    description="No interaction data available for the selected time range."
                    variant="noData"
                    icon={Bot}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Real-time Event Stream */}
        <div className="col-span-1">
          <Card className="h-full bg-base-100">
            <div className="card-body p-0 flex flex-col h-full">
              <div className="p-4 border-b border-base-200">
                <h2 className="card-title text-lg">Recent Activity Stream</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                {validMessageFlow.length > 0 ? (
                  validMessageFlow.slice(0, 10).map((event, idx) => (
                    <div key={`${event.timestamp}-${idx}`} className="flex items-start gap-3 p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors">
                      <div className={`p-2 rounded-full ${event.messageType === 'incoming' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {event.messageType === 'incoming' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-semibold truncate">
                            {event.botName || 'Unknown Bot'}
                          </p>
                          <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-base-content/70 truncate">
                          via {event.provider}
                        </p>
                        <div className="mt-1 flex gap-2">
                          <span className="badge badge-xs badge-ghost">{event.userId}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-base-content/50 py-8">
                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
