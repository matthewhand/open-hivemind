import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useGetActivityQuery } from '../../store/slices/apiSlice';
import type { ActivityResponse } from '../../services/api';

interface ActivityFilters {
  bot?: string;
  messageProvider?: string;
  llmProvider?: string;
  from?: string;
  to?: string;
}

const ActivityLog: React.FC = () => {
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<ActivityFilters>({});

  const { data, isLoading, isFetching, error, refetch } = useGetActivityQuery(appliedFilters);

  const handleApply = () => {
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters({});
    setAppliedFilters({});
  };

  const uniqueMessageProviders = useMemo(() => data?.filters.messageProviders ?? [], [data]);
  const uniqueLlmProviders = useMemo(() => data?.filters.llmProviders ?? [], [data]);
  const uniqueAgents = useMemo(() => data?.filters.agents ?? [], [data]);

  const messageTimeline = useMemo(() => buildTimelineSeries(data, 'messageProviders', uniqueMessageProviders), [data, uniqueMessageProviders]);
  const llmTimeline = useMemo(() => buildTimelineSeries(data, 'llmProviders', uniqueLlmProviders), [data, uniqueLlmProviders]);

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3}>
          <Typography variant="h6">Activity Feed</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button variant="contained" onClick={handleApply}>
              Apply Filters
            </Button>
            <Button color="secondary" onClick={handleReset}>
              Reset
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Agent</InputLabel>
              <Select
                label="Agent"
                value={filters.bot || ''}
                onChange={(event) => setFilters(prev => ({ ...prev, bot: event.target.value || undefined }))}
              >
                <MenuItem value="">All</MenuItem>
                {uniqueAgents.map(agent => (
                  <MenuItem key={agent} value={agent}>{agent}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Message Provider</InputLabel>
              <Select
                label="Message Provider"
                value={filters.messageProvider || ''}
                onChange={(event) => setFilters(prev => ({ ...prev, messageProvider: event.target.value || undefined }))}
              >
                <MenuItem value="">All</MenuItem>
                {uniqueMessageProviders.map(provider => (
                  <MenuItem key={provider} value={provider}>{provider}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>LLM Provider</InputLabel>
              <Select
                label="LLM Provider"
                value={filters.llmProvider || ''}
                onChange={(event) => setFilters(prev => ({ ...prev, llmProvider: event.target.value || undefined }))}
              >
                <MenuItem value="">All</MenuItem>
                {uniqueLlmProviders.map(provider => (
                  <MenuItem key={provider} value={provider}>{provider}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="From"
              type="datetime-local"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.from || ''}
              onChange={(event) => setFilters(prev => ({ ...prev, from: event.target.value || undefined }))}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="To"
              type="datetime-local"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={filters.to || ''}
              onChange={(event) => setFilters(prev => ({ ...prev, to: event.target.value || undefined }))}
            />
          </Grid>
        </Grid>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load activity log</Alert>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>Message Provider Activity</Typography>
              <TimelineChart data={messageTimeline} seriesKeys={uniqueMessageProviders} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>LLM Usage Activity</Typography>
              <TimelineChart data={llmTimeline} seriesKeys={uniqueLlmProviders} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Per-Agent Metrics</Typography>
              <AgentMetricsTable metrics={data?.agentMetrics ?? []} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Recent Events</Typography>
              {data?.events.length ? (
                <List dense>
                  {data.events.slice().reverse().map(event => (
                    <ListItem key={event.id} divider>
                      <ListItemText
                        primary={`${event.botName} · ${event.provider} · ${event.llmProvider}`}
                        secondary={`${formatTimestamp(event.timestamp)} — ${event.messageType} — ${event.status}${event.errorMessage ? ` (${event.errorMessage})` : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No activity recorded for the selected filters.
                </Typography>
              )}
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

interface TimelineChartProps {
  data: Array<Record<string, number | string>>;
  seriesKeys: string[];
}

const colors = ['#1976d2', '#9c27b0', '#009688', '#ff5722', '#607d8b', '#795548'];

const TimelineChart: React.FC<TimelineChartProps> = ({ data, seriesKeys }) => {
  if (!data.length || !seriesKeys.length) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight={240}>
        <Typography variant="body2" color="text.secondary">
          Not enough data to display a timeline.
        </Typography>
      </Box>
    );
  }

  return (
    <Box height={280}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" tickFormatter={formatShortTime} minTickGap={40} />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value: number) => value.toString()} labelFormatter={formatTimestamp} />
          <Legend />
          {seriesKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

function buildTimelineSeries(data: ActivityResponse | undefined, field: 'messageProviders' | 'llmProviders', keys: string[]) {
  if (!data || !data.timeline.length || keys.length === 0) {
    return [];
  }
  return data.timeline.map(bucket => {
    const entry: Record<string, number | string> = { timestamp: bucket.timestamp };
    keys.forEach(key => {
      entry[key] = bucket[field][key] || 0;
    });
    return entry;
  });
}

interface AgentMetricsTableProps {
  metrics: ActivityResponse['agentMetrics'];
}

const AgentMetricsTable: React.FC<AgentMetricsTableProps> = ({ metrics }) => {
  if (!metrics.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No per-agent metrics available for the selected filters.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Agent</TableCell>
          <TableCell>Provider</TableCell>
          <TableCell>LLM</TableCell>
          <TableCell align="right">Events</TableCell>
          <TableCell align="right">Errors</TableCell>
          <TableCell align="right">Total Messages</TableCell>
          <TableCell>Last Activity</TableCell>
          <TableCell>Recent Errors</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {metrics.map(metric => (
          <TableRow key={metric.botName} hover>
            <TableCell>{metric.botName}</TableCell>
            <TableCell>{metric.messageProvider}</TableCell>
            <TableCell>{metric.llmProvider}</TableCell>
            <TableCell align="right">{metric.events}</TableCell>
            <TableCell align="right">{metric.errors}</TableCell>
            <TableCell align="right">{metric.totalMessages}</TableCell>
            <TableCell>{formatTimestamp(metric.lastActivity)}</TableCell>
            <TableCell>{metric.recentErrors.slice(-3).join(', ') || '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatShortTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default ActivityLog;
