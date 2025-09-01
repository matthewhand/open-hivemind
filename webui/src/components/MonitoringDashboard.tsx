import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  LinearProgress,
  Button,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  TrendingUp as TrendingUpIcon,
  Error as ErrorIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../contexts/WebSocketContext';
import type { MessageFlowEvent, AlertEvent, PerformanceMetric } from '../../../src/webui/services/WebSocketService';

const MonitoringDashboard: React.FC = () => {
  const {
    isConnected,
    messageFlow,
    alerts,
    performanceMetrics,
    connect,
    disconnect
  } = useWebSocket();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical': return 'error';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getMessageTypeColor = (type: string) => {
    return type === 'incoming' ? 'primary' : 'secondary';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getCurrentMetrics = () => {
    return performanceMetrics[performanceMetrics.length - 1] || {
      memoryUsage: 0,
      messageRate: 0,
      errorRate: 0,
      activeConnections: 0
    };
  };

  const currentMetrics = getCurrentMetrics();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Real-Time Monitoring Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {isConnected ? (
              <WifiIcon color="success" />
            ) : (
              <WifiOffIcon color="error" />
            )}
            <Typography variant="body2" color={isConnected ? 'success.main' : 'error.main'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {!isConnected && (
            <Button variant="contained" onClick={connect}>
              Connect
            </Button>
          )}
        </Box>
      </Box>

      {/* Connection Status Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          WebSocket connection is not active. Real-time updates are not available.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Performance Metrics Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory Usage
              </Typography>
              <Typography variant="h4" color="primary">
                {currentMetrics.memoryUsage} MB
              </Typography>
              <Box mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((currentMetrics.memoryUsage / 512) * 100, 100)}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Message Rate
              </Typography>
              <Typography variant="h4" color="secondary">
                {currentMetrics.messageRate}/min
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUpIcon color="secondary" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Messages per minute
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Rate
              </Typography>
              <Typography variant="h4" color={currentMetrics.errorRate > 0 ? 'error' : 'success'}>
                {currentMetrics.errorRate}/min
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                {currentMetrics.errorRate > 0 ? (
                  <ErrorIcon color="error" />
                ) : (
                  <TrendingUpIcon color="success" />
                )}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Errors per minute
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Connections
              </Typography>
              <Typography variant="h4" color="info">
                {currentMetrics.activeConnections}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <WifiIcon color="info" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Connected clients
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Message Flow */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Message Flow
              </Typography>
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {messageFlow.slice(-10).reverse().map((message) => (
                  <ListItem key={message.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <MessageIcon fontSize="small" />
                          <Typography variant="body2">
                            {message.botName} - {message.channelId}
                          </Typography>
                          <Chip
                            label={message.messageType}
                            size="small"
                            color={getMessageTypeColor(message.messageType)}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(message.timestamp)} • {message.contentLength} chars
                          {message.processingTime && ` • ${message.processingTime}ms`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
                {messageFlow.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No messages yet"
                      secondary="Message flow will appear here as bots process messages"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Alerts
              </Typography>
              <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                {alerts.slice(-10).reverse().map((alert) => (
                  <ListItem key={alert.id} divider>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <ErrorIcon fontSize="small" />
                          <Typography variant="body2">
                            {alert.title}
                          </Typography>
                          <Chip
                            label={alert.level}
                            size="small"
                            color={getAlertColor(alert.level)}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTimestamp(alert.timestamp)}
                          {alert.botName && ` • ${alert.botName}`}
                        </Typography>
                      }
                    />
                    {alert.message && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {alert.message}
                      </Typography>
                    )}
                  </ListItem>
                ))}
                {alerts.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No alerts"
                      secondary="System alerts will appear here"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Chart Placeholder */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends (Last 5 minutes)
              </Typography>
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Real-time performance charts will be displayed here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MonitoringDashboard;