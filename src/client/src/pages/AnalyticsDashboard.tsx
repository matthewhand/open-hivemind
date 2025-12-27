import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import MetricChart from '../components/Monitoring/MetricChart';
import StatusCard from '../components/Monitoring/StatusCard';

const AnalyticsDashboard: React.FC = () => {
  const { messageFlow, performanceMetrics, botStats } = useWebSocket();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [featureMetrics, setFeatureMetrics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();

    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      // Mock analytics data for demonstration
      const mockAnalytics = {
        usageMetrics: {
          totalMessages: 15420,
          activeUsers: 234,
          totalBots: 8,
          avgResponseTime: 145,
          messageVolume: [
            { timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), value: 120 },
            { timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), value: 180 },
            { timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), value: 220 },
            { timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), value: 190 },
            { timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), value: 250 },
            { timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), value: 310 },
            { timestamp: new Date().toISOString(), value: 280 },
          ],
        },
        userEngagement: {
          dailyActiveUsers: 234,
          weeklyActiveUsers: 892,
          monthlyActiveUsers: 2156,
          avgSessionDuration: 1250, // seconds
          retentionRate: 78.5,
          userGrowth: 12.3,
        },
        featureAdoption: {
          chatInterface: 95.2,
          botManagement: 78.6,
          analytics: 62.1,
          configuration: 45.8,
          apiAccess: 23.4,
          advancedFeatures: 15.2,
        },
        performance: {
          avgLatency: 145,
          p95Latency: 280,
          p99Latency: 450,
          errorRate: 0.8,
          throughput: 1240,
          availability: 99.8,
        },
      };

      setAnalyticsData(mockAnalytics);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setIsLoading(false);
    }
  };

  const data = analyticsData || {
    usageMetrics: {
      totalMessages: 15420,
      activeUsers: 234,
      totalBots: 8,
      avgResponseTime: 145,
    },
    userEngagement: {
      dailyActiveUsers: 234,
      weeklyActiveUsers: 892,
      monthlyActiveUsers: 2156,
      avgSessionDuration: 1250,
      retentionRate: 78.5,
      userGrowth: 12.3,
    },
    featureAdoption: {
      chatInterface: 95.2,
      botManagement: 78.6,
      analytics: 62.1,
      configuration: 45.8,
      apiAccess: 23.4,
      advancedFeatures: 15.2,
    },
    performance: {
      avgLatency: 145,
      p95Latency: 280,
      p99Latency: 450,
      errorRate: 0.8,
      throughput: 1240,
      availability: 99.8,
    },
  };

  const usageMetricsCards = [
    {
      title: 'Total Messages',
      subtitle: 'All-time message count',
      status: 'healthy' as const,
      metrics: [
        { label: 'Messages', value: data.usageMetrics.totalMessages.toLocaleString(), icon: '💬' },
        { label: 'Today', value: '2,847', trend: 'up', trendValue: 18 },
        { label: 'This Week', value: '18,234', trend: 'up', trendValue: 12 },
        { label: 'Growth', value: 23, unit: '%', trend: 'up', trendValue: 5 },
      ],
    },
    {
      title: 'Active Users',
      subtitle: 'User engagement metrics',
      status: 'healthy' as const,
      metrics: [
        { label: 'Daily Active', value: data.userEngagement.dailyActiveUsers, trend: 'up', trendValue: 8 },
        { label: 'Weekly Active', value: data.userEngagement.weeklyActiveUsers, trend: 'up', trendValue: 12 },
        { label: 'Monthly Active', value: data.userEngagement.monthlyActiveUsers, trend: 'up', trendValue: 15 },
        { label: 'Retention', value: data.userEngagement.retentionRate, unit: '%', trend: 'stable' },
      ],
    },
    {
      title: 'Bot Performance',
      subtitle: 'Bot activity and health',
      status: data.performance.errorRate > 2 ? 'warning' : 'healthy',
      metrics: [
        { label: 'Total Bots', value: data.usageMetrics.totalBots, icon: '🤖' },
        { label: 'Active Bots', value: 7, icon: '✅' },
        { label: 'Avg Response', value: data.usageMetrics.avgResponseTime, unit: 'ms', trend: 'down', trendValue: -8 },
        { label: 'Error Rate', value: data.performance.errorRate, unit: '%', trend: 'down', trendValue: -15 },
      ],
    },
    {
      title: 'System Health',
      subtitle: 'Overall system performance',
      status: data.performance.availability > 99 ? 'healthy' : 'warning',
      metrics: [
        { label: 'Availability', value: data.performance.availability, unit: '%' },
        { label: 'Avg Latency', value: data.performance.avgLatency, unit: 'ms', trend: 'stable' },
        { label: 'P95 Latency', value: data.performance.p95Latency, unit: 'ms' },
        { label: 'Throughput', value: data.performance.throughput, unit: 'req/s', trend: 'up', trendValue: 6 },
      ],
    },
  ];

  const generateFeatureData = () => {
    return Object.entries(data.featureAdoption).map(([feature, adoption]) => ({
      timestamp: new Date().toISOString(),
      value: adoption as number,
      label: feature.replace(/([A-Z])/g, ' $1').trim(),
      category: 'feature',
    }));
  };

  const generatePerformanceData = () => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (23 - i) * 3600000).toISOString(),
      value: data.performance.avgLatency + (Math.random() - 0.5) * 50,
      label: 'Latency',
      category: 'performance',
    }));
  };

  const generateUserGrowthData = () => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (29 - i) * 86400000).toISOString(),
      value: Math.max(50, data.userEngagement.dailyActiveUsers + (Math.random() - 0.5) * 100),
      label: 'Daily Active Users',
      category: 'users',
    }));
  };

  return (
    <div className="min-h-screen bg-base-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              Analytics Dashboard
              <div className="badge badge-warning gap-1 font-bold">
                MOCK DATA
              </div>
            </h1>
            <p className="text-lg text-neutral-content/70">
              Usage metrics, user engagement, and performance analytics.
              <span className="text-warning text-sm ml-2 font-mono bg-warning/10 px-2 py-1 rounded">
                (Demonstration Mode: Using simulated data)
              </span>
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
              <option value="90d">Last 90 Days</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {usageMetricsCards.map((card) => (
          <StatusCard
            key={card.title}
            title={card.title}
            subtitle={card.subtitle}
            status={card.status}
            metrics={card.metrics}
            compact={true}
          />
        ))}
      </div>

      {/* Usage and Activity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="Message Volume Trends"
          data={data.usageMetrics.messageVolume || []}
          type="area"
          color="#8b5cf6"
          unit="messages"
          height={350}
        />
        <MetricChart
          title="User Growth"
          data={generateUserGrowthData()}
          type="line"
          color="#10b981"
          height={350}
        />
      </div>

      {/* Feature Adoption and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <MetricChart
          title="Feature Adoption Rate"
          data={generateFeatureData()}
          type="bar"
          color="#f59e0b"
          unit="%"
          height={350}
        />
        <MetricChart
          title="Response Time Trends"
          data={generatePerformanceData()}
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
            <h2 className="card-title mb-4">Top Performing Bots</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Bot Name</th>
                    <th>Messages</th>
                    <th>Avg Response</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Support Bot</td>
                    <td>5,234</td>
                    <td>120ms</td>
                    <td><span className="text-success">98.5%</span></td>
                  </tr>
                  <tr>
                    <td>Sales Assistant</td>
                    <td>3,892</td>
                    <td>145ms</td>
                    <td><span className="text-success">97.2%</span></td>
                  </tr>
                  <tr>
                    <td>FAQ Bot</td>
                    <td>2,156</td>
                    <td>95ms</td>
                    <td><span className="text-success">99.1%</span></td>
                  </tr>
                  <tr>
                    <td>Analytics Bot</td>
                    <td>1,847</td>
                    <td>180ms</td>
                    <td><span className="text-warning">95.8%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">User Activity Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-content/70">Peak Activity Time</span>
                <span className="font-semibold">2:00 PM - 4:00 PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-content/70">Avg Session Duration</span>
                <span className="font-semibold">{Math.floor(data.userEngagement.avgSessionDuration / 60)}m {data.userEngagement.avgSessionDuration % 60}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-content/70">Messages per User</span>
                <span className="font-semibold">24.3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-content/70">Most Active Day</span>
                <span className="font-semibold">Tuesday</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-content/70">User Satisfaction</span>
                <span className="font-semibold text-success">4.7/5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Event Stream */}
      <div className="mt-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Recent Activity Stream</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messageFlow.slice(0, 10).map((event, idx) => (
                <div key={`${event.timestamp || idx}-${event.source || idx}`} className="flex items-center gap-3 p-2 rounded bg-base-200">
                  <span className="text-2xl">💬</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.source || 'Unknown'}</p>
                    <p className="text-xs text-neutral-content/60">
                      {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Just now'}
                    </p>
                  </div>
                </div>
              ))}
              {messageFlow.length === 0 && (
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