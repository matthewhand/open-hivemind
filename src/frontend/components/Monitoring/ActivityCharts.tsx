import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
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
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Activity Charts
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Select Metric</InputLabel>
            <Select
              value={selectedMetric}
              label="Select Metric"
              onChange={(e) => setSelectedMetric(e.target.value as string)}
            >
              <MenuItem value="messageRate">Message Rate</MenuItem>
              <MenuItem value="responseTime">Response Time</MenuItem>
              <MenuItem value="memoryUsage">Memory Usage</MenuItem>
              <MenuItem value="cpuUsage">CPU Usage</MenuItem>
              <MenuItem value="activeConnections">Active Connections</MenuItem>
              <MenuItem value="errorRate">Error Rate</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      <Box sx={{ height: 400, mt: 2 }}>
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              name={getMetricLabel(selectedMetric)}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ActivityCharts;