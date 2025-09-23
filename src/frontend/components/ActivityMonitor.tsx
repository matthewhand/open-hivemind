import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Message as MessageIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
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

interface ActivityMonitorProps {
  isActive?: boolean;
  onUnseenActivityChange?: (count: number) => void;
}

const timeRanges = [
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ isActive = false, onUnseenActivityChange }) => {
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
  const [unseenCount, setUnseenCount] = useState(0);

  const lastSeenTimestampRef = useRef<string | null>(null);
  const latestTimestampRef = useRef<string | null>(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (selectedBot !== 'all') params.bot = selectedBot;
      if (selectedProvider !== 'all') params.messageProvider = selectedProvider;

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
      const fetchedEvents = response.events || [];
      setEvents(fetchedEvents);

      const totalMessages = fetchedEvents.length;
      const successCount = fetchedEvents.filter((e) => e.status === 'success').length;
      const errorCount = fetchedEvents.filter((e) => e.status === 'error').length;
      const totalProcessingTime = fetchedEvents.reduce((sum, e) => sum + (e.processingTime || 0), 0);
      const averageResponseTime = totalMessages > 0 ? totalProcessingTime / totalMessages : 0;

      setMetrics({
        totalMessages,
        successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
        averageResponseTime,
        errorCount,
      });

      const sorted = [...fetchedEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const newestTimestamp = sorted[0]?.timestamp ?? null;
      latestTimestampRef.current = newestTimestamp;

      if (isActive) {
        if (newestTimestamp) {
          lastSeenTimestampRef.current = newestTimestamp;
        }
        if (unseenCount !== 0) {
          setUnseenCount(0);
          onUnseenActivityChange?.(0);
        }
      } else if (newestTimestamp) {
        const referenceTimestamp = lastSeenTimestampRef.current;
        const newEventsCount = referenceTimestamp
          ? sorted.filter((event) => new Date(event.timestamp) > new Date(referenceTimestamp)).length
          : sorted.length;

        if (newEventsCount > 0) {
          setUnseenCount((prev) => {
            const next = prev + newEventsCount;
            onUnseenActivityChange?.(next);
            return next;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBot, selectedProvider, timeRange, isActive]);

  useEffect(() => {
    if (isActive) {
      const newest = latestTimestampRef.current;
      if (newest) {
        lastSeenTimestampRef.current = newest;
      }
      if (unseenCount !== 0) {
        setUnseenCount(0);
        onUnseenActivityChange?.(0);
      }
    }
  }, [isActive, unseenCount, onUnseenActivityChange]);

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

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString();
  const formatDuration = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

  const uniqueBots = useMemo(() => Array.from(new Set(events.map((event) => event.botName))), [events]);
  const uniqueProviders = useMemo(() => Array.from(new Set(events.map((event) => event.provider))), [events]);

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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Bot</InputLabel>
              <Select
                value={selectedBot}
                label="Bot"
                onChange={(e) => setSelectedBot(e.target.value)}
              >
                <MenuItem value="all">All bots</MenuItem>
                {uniqueBots.map((bot) => (
                  <MenuItem key={bot} value={bot}>
                    {bot}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Message Provider</InputLabel>
              <Select
                value={selectedProvider}
                label="Message Provider"
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <MenuItem value="all">All providers</MenuItem>
                {uniqueProviders.map((provider) => (
                  <MenuItem key={provider} value={provider}>
                    {provider}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                {timeRanges.map((range) => (
                  <MenuItem key={range.value} value={range.value}>
                    {range.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {unseenCount > 0 && !isActive && (
              <Chip
                color="warning"
                label={`${unseenCount} new ${unseenCount === 1 ? 'event' : 'events'}`}
                sx={{ alignSelf: 'center' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={3} flexWrap="wrap">
            <Box>
              <Typography variant="h6">Total Messages</Typography>
              <Typography variant="h4">{metrics.totalMessages}</Typography>
            </Box>
            <Box>
              <Typography variant="h6">Success Rate</Typography>
              <Typography variant="h4">{metrics.successRate.toFixed(1)}%</Typography>
            </Box>
            <Box>
              <Typography variant="h6">Average Response Time</Typography>
              <Typography variant="h4">{formatDuration(metrics.averageResponseTime)}</Typography>
            </Box>
            <Box>
              <Typography variant="h6">Errors</Typography>
              <Typography variant="h4">{metrics.errorCount}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Bot</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>LLM</TableCell>
              <TableCell>Message Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{formatTime(event.timestamp)}</TableCell>
                <TableCell>{event.botName}</TableCell>
                <TableCell>{event.provider}</TableCell>
                <TableCell>{event.llmProvider}</TableCell>
                <TableCell>
                  <Chip
                    label={capitalize(event.messageType)}
                    color={event.messageType === 'incoming' ? 'info' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(event.status)}
                    label={capitalize(event.status)}
                    color={getStatusColor(event.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{event.processingTime ? formatDuration(event.processingTime) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default ActivityMonitor;
