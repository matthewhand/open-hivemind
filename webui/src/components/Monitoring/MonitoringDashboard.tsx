import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  MonitorHeart as SystemIcon,
  SmartToy as BotIcon,
  Timeline as ActivityIcon,
} from '@mui/icons-material';
import SystemHealth from '../SystemHealth';
import BotStatusCard from '../BotStatusCard';
import ActivityMonitor from '../ActivityMonitor';
import { apiService } from '../../services/api';
import type { StatusResponse, Bot } from '../../services/api';

interface BotWithStatus extends Bot {
  id: string;
  statusData: {
    status: string;
    connected: boolean;
    messageCount: number;
    errorCount: number;
    responseTime: number;
    uptime: number;
    lastActivity: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

interface MonitoringDashboardProps {
  refreshInterval?: number;
  onRefresh?: () => void;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  refreshInterval = 30000,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<StatusResponse | null>(null);
  const [bots, setBots] = useState<BotWithStatus[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Refresh all monitoring data
      const [systemData, configData] = await Promise.all([
        apiService.getStatus(),
        apiService.getConfig()
      ]);

      setSystemMetrics(systemData);
      // Add mock status data to bots for demonstration
      const botsWithStatus = configData.bots.map((bot: Bot) => ({
        ...bot,
        id: bot.name,
        statusData: {
          status: 'healthy',
          connected: true,
          messageCount: Math.floor(Math.random() * 100),
          errorCount: Math.floor(Math.random() * 5),
          responseTime: Math.floor(Math.random() * 500) + 100,
          uptime: Math.floor(Math.random() * 86400),
          lastActivity: new Date().toISOString()
        }
      }));
      setBots(botsWithStatus);
      setLastRefresh(new Date());

      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to refresh monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getOverallHealthStatus = () => {
    if (!systemMetrics || !bots.length) return 'unknown';

    // Derive system health from StatusResponse data
    const systemHealth = systemMetrics.bots.some(bot => bot.status === 'error') ? 'error' :
                        systemMetrics.bots.some(bot => bot.status === 'warning') ? 'warning' : 'healthy';

    const botHealthIssues = bots.filter(bot =>
      bot.statusData?.status === 'error' || bot.statusData?.status === 'warning'
    ).length;

    if (systemHealth === 'error' || botHealthIssues > 0) return 'error';
    if (systemHealth === 'warning' || botHealthIssues > 0) return 'warning';
    return 'healthy';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const overallStatus = getOverallHealthStatus();

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            System Monitoring Dashboard
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={`Overall: ${overallStatus}`}
              color={getHealthColor(overallStatus)}
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
            <Button
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
              variant="outlined"
            >
              Refresh
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Overall Health Summary */}
      <Box sx={{ p: 3, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                System Health
              </Typography>
              <Typography variant="h4">
                {getOverallHealthStatus()}
              </Typography>
              <Chip
                label={getOverallHealthStatus()}
                color={getHealthColor(getOverallHealthStatus())}
                size="small"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Bots
              </Typography>
              <Typography variant="h4">
                {bots.filter(bot => bot.statusData?.connected).length}/{bots.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connected / Total
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Error Rate
              </Typography>
              <Typography variant="h4">
                {bots.length > 0
                  ? Math.round((bots.filter(bot => bot.statusData?.status === 'error').length / bots.length) * 100)
                  : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bots with errors
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Response Time
              </Typography>
              <Typography variant="h4">
                {bots.length > 0
                  ? Math.round(bots.reduce((acc, bot) => acc + (bot.statusData?.responseTime || 0), 0) / bots.length)
                  : 0}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <AppBar position="static" color="default" elevation={1}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<SystemIcon />} label="System Health" />
          <Tab icon={<BotIcon />} label="Bot Status" />
          <Tab icon={<ActivityIcon />} label="Activity Monitor" />
        </Tabs>
      </AppBar>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <SystemHealth refreshInterval={refreshInterval} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
          {bots.map((bot) => (
            <BotStatusCard
              key={bot.id}
              bot={bot}
              statusData={bot.statusData}
              onRefresh={handleRefresh}
            />
          ))}
          {bots.length === 0 && (
            <Alert severity="info">
              No bots configured. Add bots through the Bot Manager to see status information.
            </Alert>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <ActivityMonitor refreshInterval={refreshInterval} />
      </TabPanel>
    </Box>
  );
};

export default MonitoringDashboard;