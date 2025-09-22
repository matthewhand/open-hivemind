import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import type { ActivityTimelineBucket } from '../services/api';

interface ActivityTimelineProps {
  refreshInterval?: number;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  refreshInterval = 60000 // 1 minute default
}) => {
  const [timelineData, setTimelineData] = useState<ActivityTimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filter states
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Mock data for demonstration - in real implementation, this would come from API
  useEffect(() => {
    const generateTimelineData = () => {
      const now = new Date();
      const data: ActivityTimelineBucket[] = [];
      const providers = ['discord', 'slack', 'mattermost'];
      const llmProviders = ['openai', 'flowise', 'openwebui'];

      // Generate data for the last hour in 5-minute intervals
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
        const messageProviders: Record<string, number> = {};
        const llmProvidersData: Record<string, number> = {};

        providers.forEach(provider => {
          messageProviders[provider] = Math.floor(Math.random() * 20) + (i % 3 === 0 ? 50 : 0);
        });

        llmProviders.forEach(provider => {
          llmProvidersData[provider] = Math.floor(Math.random() * 15) + (i % 4 === 0 ? 30 : 0);
        });

        data.push({
          timestamp: timestamp.toISOString(),
          messageProviders,
          llmProviders: llmProvidersData,
        });
      }

      setTimelineData(data);
      setLastRefresh(new Date());
      setLoading(false);
    };

    generateTimelineData();

    if (refreshInterval > 0) {
      const interval = setInterval(generateTimelineData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleClearFilters = () => {
    setSelectedTimeframe('1h');
    setSelectedProvider('all');
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

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'discord':
        return 'primary';
      case 'slack':
        return 'secondary';
      case 'mattermost':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTotalActivity = (bucket: ActivityTimelineBucket) => {
    const messageTotal = Object.values(bucket.messageProviders).reduce((sum, count) => sum + count, 0);
    const llmTotal = Object.values(bucket.llmProviders).reduce((sum, count) => sum + count, 0);
    return messageTotal + llmTotal;
  };

  const getMaxActivity = () => {
    return Math.max(...timelineData.map(bucket => getTotalActivity(bucket)));
  };

  const getActivityLevel = (activity: number, maxActivity: number) => {
    const percentage = (activity / maxActivity) * 100;
    if (percentage > 80) return { level: 'high', color: 'error' };
    if (percentage > 50) return { level: 'medium', color: 'warning' };
    return { level: 'low', color: 'success' };
  };

  const maxActivity = getMaxActivity();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading activity timeline...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }


  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Activity Timeline
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {lastRefresh && (
                <Typography variant="body2" color="text.secondary">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </Typography>
              )}
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Real-time activity visualization showing message and LLM provider usage over time.
          </Typography>

          {/* Filters */}
          <Box display="flex" flexWrap="wrap" gap={2} mb={3} p={2} bgcolor="background.paper" borderRadius={1}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
              >
                <MenuItem value="15m">Last 15 minutes</MenuItem>
                <MenuItem value="1h">Last hour</MenuItem>
                <MenuItem value="6h">Last 6 hours</MenuItem>
                <MenuItem value="24h">Last 24 hours</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Provider Filter</InputLabel>
              <Select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <MenuItem value="all">All Providers</MenuItem>
                <MenuItem value="discord">Discord Only</MenuItem>
                <MenuItem value="slack">Slack Only</MenuItem>
                <MenuItem value="mattermost">Mattermost Only</MenuItem>
              </Select>
            </FormControl>

            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              variant="outlined"
            >
              Clear Filters
            </Button>
          </Box>

          {/* Timeline Visualization */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Activity Over Time
            </Typography>

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {timelineData.map((bucket, index) => {
                const totalActivity = getTotalActivity(bucket);
                const activityLevel = getActivityLevel(totalActivity, maxActivity);

                // Filter based on selected provider
                const shouldShow = selectedProvider === 'all' ||
                  (selectedProvider === 'discord' && bucket.messageProviders.discord > 0) ||
                  (selectedProvider === 'slack' && bucket.messageProviders.slack > 0) ||
                  (selectedProvider === 'mattermost' && bucket.messageProviders.mattermost > 0);

                if (!shouldShow) return null;

                return (
                  <Box
                    key={index}
                    sx={{
                      mb: 1,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {formatTimestamp(bucket.timestamp)}
                      </Typography>
                      <Chip
                        label={`${totalActivity} activities`}
                        size="small"
                        color={activityLevel.color === 'error' ? 'error' : activityLevel.color === 'warning' ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </Box>

                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {Object.entries(bucket.messageProviders).map(([provider, count]) => (
                        count > 0 && (
                          <Chip
                            key={provider}
                            label={`${getProviderIcon(provider)} ${provider}: ${count}`}
                            size="small"
                            color={getProviderColor(provider) === 'primary' ? 'primary' : getProviderColor(provider) === 'secondary' ? 'secondary' : getProviderColor(provider) === 'success' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        )
                      ))}
                    </Box>

                    <Box display="flex" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                      {Object.entries(bucket.llmProviders).map(([provider, count]) => (
                        count > 0 && (
                          <Chip
                            key={provider}
                            label={`${provider}: ${count}`}
                            size="small"
                            variant="outlined"
                          />
                        )
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Summary Statistics */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Summary Statistics</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexWrap="wrap" gap={2}>
                <Box sx={{ minWidth: 250, flex: '1 1 auto' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Total Activity
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {timelineData.reduce((sum, bucket) => sum + getTotalActivity(bucket), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total activities in selected timeframe
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 250, flex: '1 1 auto' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Peak Activity
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {maxActivity}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Highest activity in a single time slot
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 250, flex: '1 1 auto' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Average Activity
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {(timelineData.reduce((sum, bucket) => sum + getTotalActivity(bucket), 0) / timelineData.length).toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average activities per time slot
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Provider Breakdown
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {['discord', 'slack', 'mattermost'].map(provider => {
                    const total = timelineData.reduce((sum, bucket) => sum + (bucket.messageProviders[provider] || 0), 0);
                    return total > 0 && (
                      <Chip
                        key={provider}
                        label={`${getProviderIcon(provider)} ${provider}: ${total}`}
                        color={getProviderColor(provider) === 'primary' ? 'primary' : getProviderColor(provider) === 'secondary' ? 'secondary' : getProviderColor(provider) === 'success' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    );
                  })}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ActivityTimeline;