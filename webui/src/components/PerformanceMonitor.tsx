import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useAppSelector } from '../store/hooks';
import LoadingSpinner from './LoadingSpinner';

const PerformanceMonitor: React.FC = () => {
  const { performance } = useAppSelector(state => state);

  if (!performance) {
    return <LoadingSpinner message="Loading performance data..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Performance Monitor
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Performance Metrics
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Response Time: {performance.responseTime.toFixed(1)}ms
            </Typography>
            <Typography variant="body1">
              Memory Usage: {performance.memoryUsage.toFixed(1)}%
            </Typography>
            <Typography variant="body1">
              CPU Usage: {performance.cpuUsage.toFixed(1)}%
            </Typography>
            <Typography variant="body1">
              Error Rate: {performance.errorRate.toFixed(2)}%
            </Typography>
            <Typography variant="body1">
              Status: {performance.isHealthy ? 'Healthy' : 'Degraded'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceMonitor;