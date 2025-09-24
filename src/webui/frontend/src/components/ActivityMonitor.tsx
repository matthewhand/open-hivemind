import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Message as MessageIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface ActivityEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

interface ActivityMetrics {
  totalMessages: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
}

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    totalMessages: 0,
    successRate: 0,
    averageResponseTime: 0,
    errorCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('1h');

  const timeRanges = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
  ];

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (selectedBot !== 'all') params.bot = selectedBot;
      if (selectedProvider !== 'all') params.messageProvider = selectedProvider;

      // Calculate time range
      const now = new Date();
      const from = new Date();
      switch (timeRange) {
        case '15m':
          from.setMinutes(now.getMinutes() - 15);
          break;
        case '1h':
          from.setHours(now.getHours() - 1);
          break;
        case '6h':
          from.setHours(now.getHours() - 6);
          break;
        case '24h':
          from.setHours(now.getHours() - 24);
          break;
        case '7d':
          from.setDate(now.getDate() - 7);
          break;
        default:
          from.setHours(now.getHours() - 1);
      }

      params.from = from.toISOString();
      params.to = now.toISOString();

      const response = await apiService.getActivity(params);

      setEvents(response.events || []);

      // Calculate metrics
      const totalMessages = response.events.length;
      const successCount = response.events.filter(e => e.status === 'success').length;
      const errorCount = response.events.filter(e => e.status === 'error').length;
      const totalProcessingTime = response.events.reduce((sum, e) => sum + (e.processingTime || 0), 0);
      const averageResponseTime = totalMessages > 0 ? totalProcessingTime / totalMessages : 0;

      setMetrics({
        totalMessages,
        successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
        averageResponseTime,
        errorCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    // Set up polling for real-time updates
    const interval = setInterval(fetchActivity, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [selectedBot, selectedProvider, timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'timeout':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <MessageIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'timeout':
        return <TimelineIcon />;
      default:
        return <MessageIcon />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading && events.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Activity Monitor
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchActivity}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Metrics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Messages
            </Typography>
            <Typography variant="h4">
              {metrics.totalMessages}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Success Rate
            </Typography>
            <Typography variant="h4" color="success.main">
              {metrics.successRate.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Avg Response Time
            </Typography>
            <Typography variant="h4">
              {formatDuration(metrics.averageResponseTime)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Errors
            </Typography>
            <Typography variant="h4" color="error.main">
              {metrics.errorCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Bot</InputLabel>
              <Select
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
                label="Bot"
              >
                <MenuItem value="all">All Bots</MenuItem>
                <MenuItem value="Bot1">Bot 1</MenuItem>
                <MenuItem value="Bot2">Bot 2</MenuItem>
                <MenuItem value="Bot3">Bot 3</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                label="Provider"
              >
                <MenuItem value="all">All Providers</MenuItem>
                <MenuItem value="discord">Discord</MenuItem>
                <MenuItem value="slack">Slack</MenuItem>
                <MenuItem value="mattermost">Mattermost</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                {timeRanges.map((range) => (
                  <MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Bot</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Response Time</TableCell>
              <TableCell>Content Length</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.length > 0 ? (
              events.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTime(event.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {event.botName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.provider}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(event.messageType)}
                      <Typography variant="body2">
                        {event.messageType}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.status}
                      color={getStatusColor(event.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {event.processingTime ? formatDuration(event.processingTime) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {event.contentLength} chars
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No activity data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ActivityMonitor;