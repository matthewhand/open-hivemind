import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, FormControl, InputLabel, Select, MenuItem, TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { Breadcrumbs } from '../components/DaisyUI';

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'message' | 'command' | 'error' | 'system' | 'api_call';
  severity: 'info' | 'warning' | 'error' | 'success';
  source: string;
  user?: string;
  message: string;
  details?: any;
}

interface ActivityStats {
  totalEvents: number;
  eventsToday: number;
  errorRate: number;
  avgResponseTime: number;
  topSources: { name: string; count: number }[];
}

const ActivityPage: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const breadcrumbItems = [
    { label: 'Activity Monitor', href: '/uber/monitoring', isActive: true }
  ];

  // Mock data
  const mockEvents: ActivityEvent[] = [
    {
      id: '1',
      timestamp: '2024-01-15T10:30:00Z',
      type: 'message',
      severity: 'info',
      source: 'Discord Bot #1',
      user: 'user123',
      message: 'Message processed successfully',
      details: { channel: 'general', responseTime: 245 }
    },
    {
      id: '2',
      timestamp: '2024-01-15T10:25:00Z',
      type: 'command',
      severity: 'success',
      source: 'Slack Bot #2',
      user: 'admin',
      message: 'Command /status executed',
      details: { command: '/status', args: [] }
    },
    {
      id: '3',
      timestamp: '2024-01-15T10:20:00Z',
      type: 'error',
      severity: 'error',
      source: 'OpenAI Provider',
      message: 'Rate limit exceeded',
      details: { errorCode: 429, retryAfter: 60 }
    },
    {
      id: '4',
      timestamp: '2024-01-15T10:15:00Z',
      type: 'system',
      severity: 'warning',
      source: 'Health Monitor',
      message: 'High memory usage detected',
      details: { memoryUsage: 85, threshold: 80 }
    },
    {
      id: '5',
      timestamp: '2024-01-15T10:10:00Z',
      type: 'api_call',
      severity: 'info',
      source: 'MCP Server',
      message: 'Tool execution completed',
      details: { tool: 'github_create_issue', duration: 1250 }
    }
  ];

  const mockStats: ActivityStats = {
    totalEvents: 1547,
    eventsToday: 234,
    errorRate: 2.1,
    avgResponseTime: 340,
    topSources: [
      { name: 'Discord Bot #1', count: 456 },
      { name: 'Slack Bot #2', count: 234 },
      { name: 'OpenAI Provider', count: 189 },
      { name: 'MCP Server', count: 123 },
      { name: 'Health Monitor', count: 87 }
    ]
  };

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setEvents(mockEvents);
      setFilteredEvents(mockEvents);
      setStats(mockStats);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = events;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.user?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === typeFilter);
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(event => event.severity === severityFilter);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, typeFilter, severityFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'success';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'command': return '⚡';
      case 'error': return '❌';
      case 'system': return '⚙️';
      case 'api_call': return '🔗';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading activity data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />
      
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Activity Monitor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time monitoring of system events and performance metrics
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Events
                </Typography>
                <Typography variant="h4">
                  {stats.totalEvents.toLocaleString()}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TrendingUpIcon color="success" fontSize="small" />
                  <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                    +{stats.eventsToday} today
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Error Rate
                </Typography>
                <Typography variant="h4">
                  {stats.errorRate}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TrendingDownIcon color="success" fontSize="small" />
                  <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                    Improving
                  </Typography>
                </Box>
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
                  {stats.avgResponseTime}ms
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TimeIcon color="info" fontSize="small" />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    Last hour
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Sources
                </Typography>
                <Typography variant="h4">
                  {stats.topSources.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Currently reporting
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="message">Messages</MenuItem>
            <MenuItem value="command">Commands</MenuItem>
            <MenuItem value="error">Errors</MenuItem>
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="api_call">API Calls</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severityFilter}
            label="Severity"
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <MenuItem value="all">All Severities</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredEvents.length} of {events.length} events
      </Typography>

      {/* Events List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredEvents.map((event) => (
          <Card key={event.id}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                    {getTypeIcon(event.type)} {event.message}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label={event.severity}
                    color={getSeverityColor(event.severity) as any}
                    size="small"
                  />
                  <Chip 
                    label={event.type}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                <strong>Source:</strong> {event.source}
                {event.user && <> • <strong>User:</strong> {event.user}</>}
                <> • <strong>Time:</strong> {new Date(event.timestamp).toLocaleString()}</>
              </Typography>

              {event.details && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(event.details, null, 2)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {filteredEvents.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No events found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search criteria
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ActivityPage;