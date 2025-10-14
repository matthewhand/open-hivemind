import React, { useEffect, useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Wifi as WifiIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { Bot, StatusResponse } from '../services/api';
import StatsCards, { useSystemStats } from './DaisyUI/StatsCards';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UnifiedDashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configData, statusData] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
      ]);
      setBots(configData.bots);
      setStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (botStatus: string) => {
    switch (botStatus.toLowerCase()) {
      case 'active':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'inactive':
      case 'unavailable':
        return 'error';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'discord':
        return '🤖';
      case 'slack':
        return '💬';
      case 'mattermost':
        return '📱';
      default:
        return '🔧';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const activeBotCount = status?.bots.filter(bot => bot.status === 'active').length || 0;
  const totalBots = bots.length;
  const totalMessages = status?.bots.reduce((sum, bot) => sum + (bot.messageCount || 0), 0) || 0;
  const totalErrors = status?.bots.reduce((sum, bot) => sum + (bot.errorCount || 0), 0) || 0;
  const errorRate = totalMessages > 0 ? (totalErrors / totalMessages * 100).toFixed(2) : '0.00';

  // Mock performance metrics for demonstration
  const performanceMetrics = {
    cpuUsage: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    responseTime: Math.random() * 200 + 50,
    activeConnections: status?.bots.filter(bot => bot.connected).length || 0,
  };

  const uptimeSeconds = status?.uptime || 0;
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeDisplay = `${uptimeHours}h ${uptimeMinutes}m`;

  const summaryCards = [
    {
      id: 'active-bots',
      title: 'Active Bots',
      value: `${activeBotCount}/${totalBots}`,
      icon: '✅',
      description: totalBots > 0 ? `${totalBots - activeBotCount} offline` : 'No bots configured',
      color: 'success' as const,
      change: totalBots > 0 ? ((activeBotCount / totalBots) * 100) : 0,
      changeType: 'increase' as const,
    },
    {
      id: 'total-messages',
      title: 'Total Messages',
      value: totalMessages,
      icon: '💬',
      description: `${performanceMetrics.activeConnections} active connections`,
      color: 'info' as const,
      change: 12.5,
      changeType: 'increase' as const,
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      value: parseFloat(errorRate),
      icon: '🚨',
      description: parseFloat(errorRate) > 2 ? 'High error rate' : 'Normal operation',
      color: parseFloat(errorRate) > 2 ? 'error' as const : 'warning' as const,
      change: -5.2,
      changeType: parseFloat(errorRate) > 2 ? 'decrease' as const : 'increase' as const,
    },
    {
      id: 'uptime',
      title: 'System Uptime',
      value: uptimeDisplay,
      icon: '⏰',
      description: 'System running continuously',
      color: 'success' as const,
      change: 0.1,
      changeType: 'neutral' as const,
    },
  ];

  const performanceCards = [
    {
      id: 'cpu-usage',
      title: 'CPU Usage',
      value: performanceMetrics.cpuUsage,
      icon: '📊',
      description: performanceMetrics.cpuUsage > 80 ? 'High CPU usage' : 'Normal CPU usage',
      color: performanceMetrics.cpuUsage > 80 ? 'error' as const : 'primary' as const,
      change: performanceMetrics.cpuUsage > 50 ? 8.3 : -2.1,
      changeType: performanceMetrics.cpuUsage > 50 ? 'decrease' as const : 'increase' as const,
    },
    {
      id: 'memory-usage',
      title: 'Memory Usage',
      value: performanceMetrics.memoryUsage,
      icon: '💾',
      description: performanceMetrics.memoryUsage > 80 ? 'High memory usage' : 'Normal memory usage',
      color: performanceMetrics.memoryUsage > 80 ? 'error' as const : 'warning' as const,
      change: 5.7,
      changeType: 'increase' as const,
    },
    {
      id: 'response-time',
      title: 'Response Time',
      value: performanceMetrics.responseTime,
      icon: '⚡',
      description: 'Average response time',
      color: 'accent' as const,
      change: -12.8,
      changeType: 'increase' as const, // Lower response time is good
    },
    {
      id: 'active-connections',
      title: 'Active Connections',
      value: performanceMetrics.activeConnections,
      icon: '🔗',
      description: 'Connected bot instances',
      color: 'info' as const,
      change: 3.2,
      changeType: 'increase' as const,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Open-Hivemind Dashboard
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {refreshing && <CircularProgress size={20} />}
          <Tooltip title="Refresh Data">
            <span>
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Overview" id="dashboard-tab-0" aria-controls="dashboard-tabpanel-0" />
          <Tab label="Performance" id="dashboard-tab-1" aria-controls="dashboard-tabpanel-1" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* DaisyUI Stats Cards */}
        <Box mb={4}>
          <StatsCards 
            stats={summaryCards}
            isLoading={loading}
            showTrends={true}
            autoRefresh={true}
            refreshInterval={30000}
            gridCols={4}
          />
        </Box>

          {/* Bot Status Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Bot Status
            </Typography>
            <Grid container spacing={2}>
              {bots.map((bot, index) => {
                const botStatusData = status?.bots[index];
                const botStatus = botStatusData?.status || 'unknown';
                const connected = botStatusData?.connected ?? false;
                const messageCount = botStatusData?.messageCount || 0;
                const errorCount = botStatusData?.errorCount || 0;

                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={bot.name}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Typography variant="h6" component="h2" sx={{ mr: 1 }}>
                            {getProviderIcon(bot.messageProvider)}
                          </Typography>
                          <Typography variant="h6" component="h2">
                            {bot.name}
                          </Typography>
                        </Box>

                        <Box mb={2}>
                          <Chip
                            label={`Provider: ${bot.messageProvider}`}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                          <Chip
                            label={`LLM: ${bot.llmProvider}`}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                        </Box>

                        <Box display="flex" alignItems="center" mb={1}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Status:
                          </Typography>
                          <Chip
                            label={botStatus}
                            color={getStatusColor(botStatus)}
                            size="small"
                          />
                        </Box>

                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Chip
                            label={connected ? 'Connected' : 'Disconnected'}
                            color={connected ? 'success' : 'warning'}
                            size="small"
                          />
                          <Chip
                            label={`Messages: ${messageCount}`}
                            size="small"
                          />
                          {errorCount > 0 && (
                            <Chip
                              label={`Errors: ${errorCount}`}
                              color="error"
                              size="small"
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
      </TabPanel>

      {/* Performance Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* DaisyUI Performance Stats Cards */}
        <Box mb={4}>
          <StatsCards 
            stats={performanceCards}
            isLoading={loading}
            showTrends={true}
            autoRefresh={true}
            refreshInterval={15000}
            gridCols={4}
          />
        </Box>

          {/* Performance Charts Placeholder */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Box sx={{ height: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      CPU Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={performanceMetrics.cpuUsage}
                      color={performanceMetrics.cpuUsage > 80 ? 'error' : 'primary'}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Memory Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={performanceMetrics.memoryUsage}
                      color={performanceMetrics.memoryUsage > 80 ? 'error' : 'primary'}
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" color="text.secondary">
                      Real-time performance charts and detailed metrics will be displayed here.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
      </TabPanel>
    </Container>
  );
};

export default UnifiedDashboard;