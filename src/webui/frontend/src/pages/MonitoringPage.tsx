import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import PerformanceMonitor from '../components/PerformanceMonitor';
import { useWebSocket } from '../hooks/useWebSocket';

const MonitoringPage: React.FC = () => {
  const { connect, disconnect, isConnected } = useWebSocket();

  useEffect(() => {
    // Connect to WebSocket for real-time monitoring
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Monitoring
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Real-time performance metrics and system health monitoring.
        {isConnected ? ' (Live updates enabled)' : ' (Connecting...)'}
      </Typography>
      <PerformanceMonitor />
    </Box>
  );
};

export default MonitoringPage;