import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Badge,
  Loading,
  Alert,
  Grid,
  Tabs,
  Button,
  Tooltip,
  LinearProgress,
} from '../components/DaisyUI';
import { apiService } from '../services/api';
import type { Bot, StatusResponse } from '../services/api';

// Inline SVG icons to replace MUI icons
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const MemoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const SpeedIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-.708.708a4 4 0 105.656 5.656l.708-.708a4 4 0 000-5.656z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WifiIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

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
      {value === index && <div className="p-6">{children}</div>}
    </div>
  );
}

const UnifiedDashboard: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configData, statusData, healthData] = await Promise.all([
        apiService.getConfig(),
        apiService.getStatus(),
        apiService.getSystemHealth(),
      ]);
      setBots(configData.bots);
      setStatus(statusData);
      setHealth(healthData);
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

  const performanceMetrics = {
    cpuUsage: health?.cpu?.user ? (health.cpu.user / 100) * 100 : 0, // Convert to percentage
    memoryUsage: health?.memory?.usage ? health.memory.usage * 100 : 0,
    responseTime: 0, // Not available in health data
    activeConnections: status?.bots.filter(bot => bot.connected).length || 0,
  };

  const uptimeSeconds = status?.uptime || 0;
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeDisplay = `${uptimeHours}h ${uptimeMinutes}m`;

  const summaryCards = [
    {
      title: 'Active Bots',
      value: `${activeBotCount}/${totalBots}`,
      icon: <CheckCircleIcon color="success" />,
      helper: totalBots > 0 ? `${totalBots - activeBotCount} offline` : 'No bots configured',
    },
    {
      title: 'Total Messages',
      value: totalMessages.toLocaleString(),
      icon: <MessageIcon color="primary" />,
      helper: `${performanceMetrics.activeConnections} active connections`,
    },
    {
      title: 'Error Rate',
      value: `${errorRate}%`,
      icon: <ErrorIcon color={parseFloat(errorRate) > 2 ? 'error' : 'warning'} />,
      helper: parseFloat(errorRate) > 2 ? 'High error rate' : 'Normal operation',
    },
    {
      title: 'Uptime',
      value: uptimeDisplay,
      icon: <TrendingUpIcon color="success" />,
      helper: 'System running continuously',
    },
  ];

  const performanceCards = [
    {
      title: 'CPU Usage',
      value: `${performanceMetrics.cpuUsage.toFixed(1)}%`,
      icon: <TrendingUpIcon color={performanceMetrics.cpuUsage > 80 ? 'error' : 'primary'} />,
      helper: performanceMetrics.cpuUsage > 80 ? 'High CPU usage' : 'Normal CPU usage',
    },
    {
      title: 'Memory Usage',
      value: `${performanceMetrics.memoryUsage.toFixed(1)}%`,
      icon: <MemoryIcon color={performanceMetrics.memoryUsage > 80 ? 'error' : 'primary'} />,
      helper: performanceMetrics.memoryUsage > 80 ? 'High memory usage' : 'Normal memory usage',
    },
    {
      title: 'Response Time',
      value: `${performanceMetrics.responseTime.toFixed(1)} ms`,
      icon: <SpeedIcon color="secondary" />,
      helper: 'Average response time',
    },
    {
      title: 'Active Connections',
      value: performanceMetrics.activeConnections.toString(),
      icon: <WifiIcon color="info" />,
      helper: 'Connected bot instances',
    },
  ];

  return (
    <Container maxWidth="xl" className="mt-8 mb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4" component="h1">
          Open-Hivemind Dashboard
        </Typography>
        <div className="flex items-center gap-4">
          {refreshing && <span className="loading loading-spinner loading-sm"></span>}
          <Tooltip content="Refresh Data">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshIcon />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-base-300 mb-6">
        <div className="tabs tabs-bordered">
          <button
            className={`tab ${tabValue === 0 ? 'tab-active' : ''}`}
            onClick={() => setTabValue(0)}
          >
            Overview
          </button>
          <button
            className={`tab ${tabValue === 1 ? 'tab-active' : ''}`}
            onClick={() => setTabValue(1)}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Summary Cards */}
          {summaryCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    {card.icon}
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        {card.title}
                      </Typography>
                      <Typography variant="h5" component="p">
                        {card.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.helper}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

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
        </Grid>
      </TabPanel>

      {/* Performance Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Performance Metrics Cards */}
          {performanceCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    {card.icon}
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        {card.title}
                      </Typography>
                      <Typography variant="h5" component="p">
                        {card.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.helper}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

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
        </Grid>
      </TabPanel>
    </Container>
  );
};

export default UnifiedDashboard;