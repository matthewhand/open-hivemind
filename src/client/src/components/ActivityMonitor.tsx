import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as TimeIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Message as MessageIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { Card, Button, Badge, Chip, LoadingSpinner } from '../components/DaisyUI';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'message' | 'command' | 'error' | 'system' | 'api_call';
  severity: 'info' | 'warning' | 'error' | 'success';
  source: string;
  user?: string;
  message: string;
  details?: any;
}

export interface ActivityStats {
  totalEvents: number;
  eventsToday: number;
  errorRate: number;
  avgResponseTime: number;
  topSources: { name: string; count: number }[];
}

interface ActivityMonitorProps {
  showPopoutButton?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  showPopoutButton = false,
  compact = false,
  autoRefresh = true
}) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Mock data generator
  const generateMockData = () => {
    const mockEvents: ActivityEvent[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'message',
        severity: 'info',
        source: 'Discord Bot #1',
        user: 'user123',
        message: 'Message processed successfully',
        details: { channel: 'general', responseTime: 245 }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'command',
        severity: 'success',
        source: 'Telegram Bot',
        user: 'admin',
        message: 'Status command executed',
        details: { executionTime: 120 }
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: 'error',
        severity: 'error',
        source: 'API Gateway',
        message: 'Rate limit exceeded',
        details: { endpoint: '/api/v1/messages', limit: 100 }
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 900000).toISOString(),
        type: 'system',
        severity: 'warning',
        source: 'System Monitor',
        message: 'High memory usage detected',
        details: { usage: '87%', threshold: '80%' }
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        type: 'api_call',
        severity: 'info',
        source: 'LLM Service',
        user: 'bot456',
        message: 'OpenAI API call completed',
        details: { model: 'gpt-4', tokens: 150, cost: '$0.003' }
      }
    ];

    const mockStats: ActivityStats = {
      totalEvents: 1247,
      eventsToday: 89,
      errorRate: 2.3,
      avgResponseTime: 285,
      topSources: [
        { name: 'Discord Bot #1', count: 342 },
        { name: 'Telegram Bot', count: 287 },
        { name: 'API Gateway', count: 198 },
        { name: 'LLM Service', count: 156 }
      ]
    };

    return { events: mockEvents, stats: mockStats };
  };

  // Load data
  const loadData = () => {
    setLoading(true);
    setTimeout(() => {
      const { events: mockEvents, stats: mockStats } = generateMockData();
      setEvents(mockEvents);
      setStats(mockStats);
      setLastRefresh(new Date());
      setLoading(false);
    }, 500);
  };

  // Auto-refresh
  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filter events
  useEffect(() => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.user?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === typeFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(event => event.severity === severityFilter);
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, typeFilter, severityFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return '💬';
      case 'command': return '⚡';
      case 'error': return '❌';
      case 'system': return '⚙️';
      case 'api_call': return '🔌';
      default: return '📄';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const openPopout = () => {
    const popoutWindow = window.open(
      '/activity',
      'activity-monitor',
      'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );
    if (popoutWindow) {
      popoutWindow.focus();
    }
  };

  if (compact) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Activity Monitor</h3>
          <div className="flex gap-2">
            <Tooltip title="Refresh">
              <IconButton onClick={loadData} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {showPopoutButton && (
              <Tooltip title="Open in new window">
                <IconButton onClick={openPopout} size="small">
                  <OpenInNewIcon />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="bg-base-100 rounded-lg p-3 border border-base-300">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{getTypeIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Chip size="sm" color={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Chip>
                      <span className="text-xs text-base-content/60">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{event.message}</p>
                    <p className="text-xs text-base-content/60">
                      {event.source} {event.user && `• ${event.user}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Activity Monitor</h2>
          <p className="text-base-content/60">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {showPopoutButton && (
            <Button onClick={openPopout} variant="primary" size="sm">
              <OpenInNewIcon className="w-4 h-4 mr-2" />
              Popout
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="stat">
              <div className="stat-title">Total Events</div>
              <div className="stat-value text-2xl">{stats.totalEvents.toLocaleString()}</div>
              <div className="stat-desc">All time activity</div>
            </div>
          </Card>

          <Card>
            <div className="stat">
              <div className="stat-title">Events Today</div>
              <div className="stat-value text-2xl text-success">{stats.eventsToday}</div>
              <div className="stat-desc flex items-center">
                <TrendingUpIcon className="w-4 h-4 mr-1" />
                12% from yesterday
              </div>
            </div>
          </Card>

          <Card>
            <div className="stat">
              <div className="stat-title">Error Rate</div>
              <div className="stat-value text-2xl text-error">{stats.errorRate}%</div>
              <div className="stat-desc flex items-center">
                <TrendingDownIcon className="w-4 h-4 mr-1" />
                Down from last week
              </div>
            </div>
          </Card>

          <Card>
            <div className="stat">
              <div className="stat-title">Avg Response</div>
              <div className="stat-value text-2xl">{stats.avgResponseTime}ms</div>
              <div className="stat-desc flex items-center">
                <TimeIcon className="w-4 h-4 mr-1" />
                Good performance
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="card-body">
          <h3 className="card-title">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon className="w-4 h-4 mr-2 text-base-content/60" />
                ),
              }}
              className="w-full"
            />

            <FormControl className="w-full">
              <InputLabel>Event Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Event Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="message">Messages</MenuItem>
                <MenuItem value="command">Commands</MenuItem>
                <MenuItem value="error">Errors</MenuItem>
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="api_call">API Calls</MenuItem>
              </Select>
            </FormControl>

            <FormControl className="w-full">
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                label="Severity"
              >
                <MenuItem value="all">All Severities</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="success">Success</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>
      </Card>

      {/* Events List */}
      <Card>
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title">
              Activity Log
              <Badge color="neutral" className="ml-2">
                {filteredEvents.length}
              </Badge>
            </h3>
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredEvents.map((event) => (
                <div key={event.id} className="bg-base-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{getTypeIcon(event.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Chip color={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Chip>
                        <span className="text-sm text-base-content/60">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1">{event.message}</h4>
                      <p className="text-sm text-base-content/80 mb-2">
                        <strong>Source:</strong> {event.source}
                        {event.user && <span> • <strong>User:</strong> {event.user}</span>}
                      </p>
                      {event.details && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-primary">View Details</summary>
                          <pre className="mt-2 p-2 bg-base-300 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ActivityMonitor;