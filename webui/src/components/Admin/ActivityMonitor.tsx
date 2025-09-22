import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  DatePicker,
  LocalizationProvider,
  Pagination,
  Box as MuiBox,
  Tooltip,
  IconButton
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { format, subDays, subHours } from 'date-fns';

interface ActivityFilter {
  agentId?: string;
  messageProvider?: string;
  llmProvider?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface MessageActivity {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  messageProvider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  mcpToolsUsed?: string[];
}

interface ChartData {
  timestamp: string;
  count: number;
  provider?: string;
  usage?: number;
  responseTime?: number;
}

interface ActivitySummary {
  totalMessages: number;
  totalAgents: number;
  averageResponseTime: number;
  errorRate: number;
  messagesByProvider: Record<string, number>;
  messagesByAgent: Record<string, number>;
  llmUsageByProvider: Record<string, number>;
  timeRangeStart: string;
  timeRangeEnd: string;
}

interface Agent {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ActivityMonitor: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [activities, setActivities] = useState<MessageActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Filter states
  const [filter, setFilter] = useState<ActivityFilter>({
    startDate: subHours(new Date(), 24),
    endDate: new Date(),
    limit: 100,
    offset: 0
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0
  });

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [chartInterval, setChartInterval] = useState<'hour' | 'day'>('hour');

  useEffect(() => {
    fetchAgents();
    fetchData();
  }, [filter, currentTab]);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filter.agentId) queryParams.append('agentId', filter.agentId);
      if (filter.messageProvider) queryParams.append('messageProvider', filter.messageProvider);
      if (filter.llmProvider) queryParams.append('llmProvider', filter.llmProvider);
      if (filter.startDate) queryParams.append('startDate', filter.startDate.toISOString());
      if (filter.endDate) queryParams.append('endDate', filter.endDate.toISOString());
      if (filter.limit) queryParams.append('limit', filter.limit.toString());
      if (filter.offset) queryParams.append('offset', filter.offset.toString());

      const endpoints = {
        0: '/api/admin/activity/messages',
        1: '/api/admin/activity/chart-data',
        2: '/api/admin/activity/summary'
      };

      const endpoint = endpoints[currentTab as keyof typeof endpoints];
      const response = await fetch(`${endpoint}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      switch (currentTab) {
        case 0: // Messages
          setActivities(data.messages || []);
          setPagination({
            page: Math.floor((filter.offset || 0) / (filter.limit || 100)) + 1,
            totalPages: Math.ceil((data.total || 0) / (filter.limit || 100)),
            totalItems: data.total || 0
          });
          break;
        case 1: // Charts
          const chartResponse = await fetch(`/api/admin/activity/chart-data?${queryParams}&interval=${chartInterval}`);
          const chartData = await chartResponse.json();
          setChartData(chartData.messageActivity || []);
          break;
        case 2: // Summary
          setSummary(data.summary);
          break;
      }
    } catch (err) {
      setError(`Failed to fetch activity data: ${err}`);
      console.error('Error fetching activity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: Partial<ActivityFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter, offset: 0 }));
  };

  const handlePageChange = (page: number) => {
    const offset = (page - 1) * (filter.limit || 100);
    setFilter(prev => ({ ...prev, offset }));
  };

  const handleQuickTimeRange = (range: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '1h':
        startDate = subHours(now, 1);
        break;
      case '24h':
        startDate = subHours(now, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subHours(now, 24);
    }
    
    handleFilterChange({ startDate, endDate: now });
  };

  const exportData = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/activity/messages?${queryParams}&limit=10000`);
      const data = await response.json();
      
      const csv = [
        ['Timestamp', 'Agent', 'Provider', 'LLM', 'Type', 'Status', 'Response Time', 'Content Length'].join(','),
        ...data.messages.map((msg: MessageActivity) => [
          msg.timestamp,
          msg.agentName,
          msg.messageProvider,
          msg.llmProvider,
          msg.messageType,
          msg.status,
          msg.processingTime || '',
          msg.contentLength
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-export-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to export data: ${err}`);
    }
  };

  const getUniqueProviders = (type: 'messageProvider' | 'llmProvider') => {
    return [...new Set(agents.map(agent => agent[type]))].filter(Boolean);
  };

  const renderFilters = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Filters</Typography>
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </Box>
        
        {showFilters && (
          <Box>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Agent</InputLabel>
                  <Select
                    value={filter.agentId || ''}
                    label="Agent"
                    onChange={(e) => handleFilterChange({ agentId: e.target.value || undefined })}
                  >
                    <MenuItem value="">All Agents</MenuItem>
                    {agents.map((agent) => (
                      <MenuItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Message Provider</InputLabel>
                  <Select
                    value={filter.messageProvider || ''}
                    label="Message Provider"
                    onChange={(e) => handleFilterChange({ messageProvider: e.target.value || undefined })}
                  >
                    <MenuItem value="">All Providers</MenuItem>
                    {getUniqueProviders('messageProvider').map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {provider}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>LLM Provider</InputLabel>
                  <Select
                    value={filter.llmProvider || ''}
                    label="LLM Provider"
                    onChange={(e) => handleFilterChange({ llmProvider: e.target.value || undefined })}
                  >
                    <MenuItem value="">All LLM Providers</MenuItem>
                    {getUniqueProviders('llmProvider').map((provider) => (
                      <MenuItem key={provider} value={provider}>
                        {provider}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={filter.startDate}
                    onChange={(date) => handleFilterChange({ startDate: date || undefined })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="End Date"
                    value={filter.endDate}
                    onChange={(date) => handleFilterChange({ endDate: date || undefined })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>

            <Box display="flex" gap={1} flexWrap="wrap">
              {['1h', '24h', '7d', '30d'].map((range) => (
                <Button
                  key={range}
                  size="small"
                  variant="outlined"
                  onClick={() => handleQuickTimeRange(range)}
                >
                  Last {range}
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderMessagesTab = () => (
    <Box>
      {renderFilters()}
      
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Message Activity ({pagination.totalItems} total)
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<RefreshIcon />}
                onClick={fetchData}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={exportData}
              >
                Export
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Agent</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>LLM</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Time</TableCell>
                    <TableCell>Length</TableCell>
                    <TableCell>MCP Tools</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Tooltip title={activity.timestamp}>
                          <span>{format(new Date(activity.timestamp), 'HH:mm:ss')}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{activity.agentName}</TableCell>
                      <TableCell>
                        <Chip label={activity.messageProvider} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={activity.llmProvider} size="small" color="secondary" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={activity.messageType} 
                          size="small"
                          color={activity.messageType === 'incoming' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={activity.status}
                          size="small"
                          color={
                            activity.status === 'success' ? 'success' :
                            activity.status === 'error' ? 'error' : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {activity.processingTime ? `${activity.processingTime}ms` : '-'}
                      </TableCell>
                      <TableCell>{activity.contentLength}</TableCell>
                      <TableCell>
                        {activity.mcpToolsUsed?.length ? (
                          <Tooltip title={activity.mcpToolsUsed.join(', ')}>
                            <Chip label={`${activity.mcpToolsUsed.length} tools`} size="small" />
                          </Tooltip>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(_, page) => handlePageChange(page)}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const renderChartsTab = () => (
    <Box>
      {renderFilters()}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Message Activity Over Time</Typography>
                <FormControl size="small">
                  <InputLabel>Interval</InputLabel>
                  <Select
                    value={chartInterval}
                    label="Interval"
                    onChange={(e) => setChartInterval(e.target.value as 'hour' | 'day')}
                  >
                    <MenuItem value="hour">Hourly</MenuItem>
                    <MenuItem value="day">Daily</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={(value) => format(new Date(value), chartInterval === 'hour' ? 'HH:mm' : 'MM/dd')}
                  />
                  <YAxis />
                  <RechartsTooltip 
                    labelFormatter={(value) => format(new Date(value), 'PPpp')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    name="Messages"
                  />
                  {chartData.some(d => d.responseTime) && (
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#82ca9d" 
                      name="Avg Response Time (ms)"
                      yAxisId="right"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {summary && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Messages by Provider
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(summary.messagesByProvider).map(([provider, count]) => ({
                        name: provider,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(summary.messagesByProvider).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderSummaryTab = () => (
    <Box>
      {renderFilters()}
      
      {summary && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Messages
                </Typography>
                <Typography variant="h4">
                  {summary.totalMessages.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Agents
                </Typography>
                <Typography variant="h4">
                  {summary.totalAgents}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Response Time
                </Typography>
                <Typography variant="h4">
                  {summary.averageResponseTime.toFixed(0)}ms
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Error Rate
                </Typography>
                <Typography variant="h4" color={summary.errorRate > 0.05 ? 'error' : 'primary'}>
                  {(summary.errorRate * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Messages by Agent
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(summary.messagesByAgent).map(([agent, count]) => ({
                    agent,
                    count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agent" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  LLM Usage by Provider
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(summary.llmUsageByProvider).map(([provider, usage]) => ({
                    provider,
                    usage
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provider" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="usage" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          Activity Monitor
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab icon={<TimelineIcon />} label="Messages" />
        <Tab icon={<AssessmentIcon />} label="Charts" />
        <Tab icon={<AssessmentIcon />} label="Summary" />
      </Tabs>

      {currentTab === 0 && renderMessagesTab()}
      {currentTab === 1 && renderChartsTab()}
      {currentTab === 2 && renderSummaryTab()}
    </Box>
  );
};

export default ActivityMonitor;