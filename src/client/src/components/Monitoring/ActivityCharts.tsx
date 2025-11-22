import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useWebSocket } from '../../hooks/useWebSocket';

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  messageRate: number;
  errorRate: number;
}

const ActivityCharts: React.FC = () => {
  const { metrics } = useWebSocket();
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('messageRate');

  // Process metrics data for charts
  useEffect(() => {
    if (metrics && metrics.length > 0) {
      // Convert to chart-friendly format
      const processedData = metrics.map(metric => ({
        time: new Date(metric.timestamp).toLocaleTimeString(),
        responseTime: metric.responseTime,
        memoryUsage: Math.round(metric.memoryUsage / 1024 / 1024), // Convert to MB
        cpuUsage: Math.round(metric.cpuUsage * 100), // Convert to percentage
        activeConnections: metric.activeConnections,
        messageRate: metric.messageRate,
        errorRate: metric.errorRate
      }));

      setChartData(processedData);
    }
  }, [metrics]);

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'responseTime': return 'Response Time (ms)';
      case 'memoryUsage': return 'Memory Usage (MB)';
      case 'cpuUsage': return 'CPU Usage (%)';
      case 'activeConnections': return 'Active Connections';
      case 'messageRate': return 'Message Rate';
      case 'errorRate': return 'Error Rate';
      default: return metric;
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl mt-6">
      <div className="card-body">
        <h2 className="card-title mb-4">
          Activity Charts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Select Metric</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              <option value="messageRate">Message Rate</option>
              <option value="responseTime">Response Time</option>
              <option value="memoryUsage">Memory Usage</option>
              <option value="cpuUsage">CPU Usage</option>
              <option value="activeConnections">Active Connections</option>
              <option value="errorRate">Error Rate</option>
            </select>
          </div>
        </div>

        <div className="h-96 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="time" stroke="currentColor" opacity={0.7} />
              <YAxis stroke="currentColor" opacity={0.7} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--b1))',
                  borderColor: 'hsl(var(--b3))',
                  color: 'hsl(var(--bc))'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke="hsl(var(--p))"
                strokeWidth={2}
                activeDot={{ r: 8 }}
                name={getMetricLabel(selectedMetric)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ActivityCharts;