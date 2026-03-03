/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService, ActivityResponse, ActivityEvent } from '../services/api';
import MetricChart from '../components/Monitoring/MetricChart';
import StatusCard from '../components/Monitoring/StatusCard';

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
        { label: 'Errors', value: activityData?.agentMetrics?.reduce((acc, m) => acc + m.errors, 0) || 0, icon: '❌' },
      ],
    },
    {
      title: 'User Engagement',
      subtitle: 'Active participants',
      status: 'healthy',
      metrics: [
        { label: 'Active Users', value: uniqueUsers, icon: '👥' },
        { label: 'Active Bots', value: activityData?.filters.agents.length || 0, icon: '🤖' },
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
            <select
              className="select select-bordered"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              className="btn btn-primary"
              onClick={fetchAnalyticsData}
              disabled={isLoading}
            >
              {isLoading ? <span className="loading loading-spinner loading-sm"></span> : '🔄'} Refresh
            </button>
          </div>
        </div>
      </div>

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

      {/* Detailed Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Bot Performance</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Bot Name</th>
                    <th>Messages</th>
                    <th>Errors</th>
                    <th>Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {botStats.map((bot) => (
                    <tr key={bot.name}>
                      <td>{bot.name}</td>
                      <td>{bot.messages}</td>
                      <td>{bot.errors}</td>
                      <td>
                        <span className={`text-${parseFloat(bot.successRate) > 98 ? 'success' : 'warning'}`}>
                          {bot.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {botStats.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-neutral-content/50">No bot activity found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-time Event Stream */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Recent Activity Stream</h2>
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
                        {event.messageType === 'incoming' ? `User: ${event.userId}` : 'Response sent'}
                      </span>
                      <span className="text-xs text-neutral-content/60">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {validMessageFlow.length === 0 && (
                <p className="text-center text-neutral-content/50 py-4">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;