import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Avatar
} from '@mui/material';
import { 
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Schedule as TimeIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';
// Simple date formatting utilities
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  if (minutes > 0) return `${minutes} minutes ago`;
  return 'Just now';
};

const format = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'debug';
  status: 'success' | 'failure' | 'pending';
  details: Record<string, unknown>;
  metadata: {
    duration?: number;
    responseSize?: number;
    errorCode?: string;
    stackTrace?: string;
    correlationId?: string;
    sessionId?: string;
  };
  hash: string; // Immutable hash for tamper detection
  previousHash?: string; // Previous event hash for chain integrity
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tenantId?: string;
  searchTerm?: string;
}

export interface AuditMetrics {
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  eventsByStatus: Record<string, number>;
  eventsByResource: Record<string, number>;
  uniqueUsers: number;
  averageResponseTime: number;
  errorRate: number;
  topActions: Array<{ action: string; count: number }>;
  timeRange: { start: Date; end: Date };
}

interface AuditTrailContextType {
  // Event management
  events: AuditEvent[];
  filteredEvents: AuditEvent[];
  metrics: AuditMetrics;
  
  // Filtering and search
  filters: AuditFilter;
  searchTerm: string;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  
  // Actions
  logEvent: (event: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'>) => Promise<void>;
  searchEvents: (searchTerm: string) => void;
  filterEvents: (filters: AuditFilter) => void;
  clearFilters: () => void;
  exportEvents: (format: 'json' | 'csv' | 'pdf') => Promise<void>;
  refreshEvents: () => Promise<void>;
  loadMoreEvents: () => Promise<void>;
  
  // Analytics
  getEventById: (id: string) => AuditEvent | undefined;
  getEventsByUser: (userId: string) => AuditEvent[];
  getEventsByResource: (resource: string, resourceId?: string) => AuditEvent[];
  getEventsByTimeRange: (start: Date, end: Date) => AuditEvent[];
  
  // Security and integrity
  verifyEventIntegrity: (event: AuditEvent) => boolean;
  verifyChainIntegrity: () => boolean;
  getTamperedEvents: () => AuditEvent[];
  
  // UI helpers
  getSeverityColor: (severity: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getSeverityIcon: (severity: string) => React.ReactNode;
  formatEventTime: (timestamp: Date) => string;
  formatEventDetails: (event: AuditEvent) => string;
  
  // Advanced features
  getUserActivityTimeline: (userId: string) => AuditEvent[];
  getResourceAccessPattern: (resource: string) => AuditEvent[];
  detectAnomalies: (threshold?: number) => AuditEvent[];
  generateComplianceReport: (standard: 'SOX' | 'HIPAA' | 'GDPR' | 'PCI-DSS') => Promise<Blob>;
}

const AuditTrailContext = createContext<AuditTrailContextType | undefined>(undefined);

// Mock data for demonstration
const generateMockEvents = (): AuditEvent[] => {
  const events: AuditEvent[] = [];
  const actions = ['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import'];
  const resources = ['bot', 'config', 'dashboard', 'analytics', 'user', 'system', 'tenant'];
  const severities: AuditEvent['severity'][] = ['info', 'warning', 'error', 'critical', 'debug'];
  const statuses: AuditEvent['status'][] = ['success', 'failure', 'pending'];
  
  const users = [
    { id: 'user-001', username: 'admin', email: 'admin@open-hivemind.com' },
    { id: 'user-002', username: 'developer', email: 'dev@open-hivemind.com' },
    { id: 'user-003', username: 'viewer', email: 'viewer@open-hivemind.com' },
    { id: 'user-004', username: 'bot-manager', email: 'botmgr@open-hivemind.com' },
  ];
  
  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const event: AuditEvent = {
      id: `audit-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last 7 days
      userId: user.id,
      username: user.username,
      userEmail: user.email,
      action,
      resource,
      resourceId: `${resource}-${Math.floor(Math.random() * 100)}`,
      tenantId: Math.random() > 0.5 ? 'tenant-001' : undefined,
      ipAddress: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: ['New York, US', 'London, UK', 'Tokyo, JP', 'Sydney, AU'][Math.floor(Math.random() * 4)],
      severity,
      status,
      details: {
        message: `${user.username} performed ${action} on ${resource}`,
        parameters: { id: `${resource}-${Math.floor(Math.random() * 100)}` },
      },
      metadata: {
        duration: Math.floor(Math.random() * 5000),
        responseSize: Math.floor(Math.random() * 10000),
        correlationId: `corr-${Math.random().toString(36).substr(2, 9)}`,
        sessionId: `sess-${Math.random().toString(36).substr(2, 9)}`,
      },
      hash: `hash-${i}`, // Simplified hash for demo
      previousHash: i > 0 ? `hash-${i - 1}` : undefined,
    };
    
    events.push(event);
  }
  
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

interface AuditTrailProviderProps {
  children: React.ReactNode;
}

export const AuditTrailProvider: React.FC<AuditTrailProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  
  const [events, setEvents] = useState<AuditEvent[]>(generateMockEvents());
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>(events);
  const [filters, setFilters] = useState<AuditFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Calculate metrics
  const metrics: AuditMetrics = {
    totalEvents: events.length,
    eventsBySeverity: events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    eventsByStatus: events.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    eventsByResource: events.reduce((acc, event) => {
      acc[event.resource] = (acc[event.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    uniqueUsers: new Set(events.map(e => e.userId)).size,
    averageResponseTime: events.reduce((acc, e) => acc + (e.metadata.duration || 0), 0) / events.length,
    errorRate: (events.filter(e => e.status === 'failure').length / events.length) * 100,
    topActions: Object.entries(
      events.reduce((acc, event) => {
        acc[event.action] = (acc[event.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count })),
    timeRange: {
      start: new Date(Math.min(...events.map(e => e.timestamp.getTime()))),
      end: new Date(Math.max(...events.map(e => e.timestamp.getTime()))),
    },
  };

  // Core functions
  const logEvent = async (eventData: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'>): Promise<void> => {
    const newEvent: AuditEvent = {
      ...eventData,
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      hash: generateEventHash(eventData),
    };
    
    setEvents(prev => [newEvent, ...prev]);
    setFilteredEvents(prev => [newEvent, ...prev]);
  };

  const searchEvents = (searchTerm: string): void => {
    setSearchTerm(searchTerm);
    applyFilters({ ...filters, searchTerm });
  };

  const filterEvents = (newFilters: AuditFilter): void => {
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const clearFilters = (): void => {
    setFilters({});
    setSearchTerm('');
    setFilteredEvents(events);
  };

  const applyFilters = (currentFilters: AuditFilter): void => {
    let filtered = [...events];
    
    if (currentFilters.searchTerm) {
      const term = currentFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.action.toLowerCase().includes(term) ||
        event.resource.toLowerCase().includes(term) ||
        event.username.toLowerCase().includes(term) ||
        event.details.message.toLowerCase().includes(term)
      );
    }
    
    if (currentFilters.userId) {
      filtered = filtered.filter(event => event.userId === currentFilters.userId);
    }
    
    if (currentFilters.action) {
      filtered = filtered.filter(event => event.action === currentFilters.action);
    }
    
    if (currentFilters.resource) {
      filtered = filtered.filter(event => event.resource === currentFilters.resource);
    }
    
    if (currentFilters.severity) {
      filtered = filtered.filter(event => event.severity === currentFilters.severity);
    }
    
    if (currentFilters.status) {
      filtered = filtered.filter(event => event.status === currentFilters.status);
    }
    
    if (currentFilters.dateFrom) {
      filtered = filtered.filter(event => event.timestamp >= currentFilters.dateFrom!);
    }
    
    if (currentFilters.dateTo) {
      filtered = filtered.filter(event => event.timestamp <= currentFilters.dateTo!);
    }
    
    if (currentFilters.tenantId) {
      filtered = filtered.filter(event => event.tenantId === currentFilters.tenantId);
    }
    
    setFilteredEvents(filtered);
  };

  const exportEvents = async (format: 'json' | 'csv' | 'pdf'): Promise<void> => {
    const data = filteredEvents.slice(0, 1000); // Limit export to 1000 events
    
    switch (format) {
      case 'json':
        downloadFile(JSON.stringify(data, null, 2), 'audit-log.json', 'application/json');
        break;
      case 'csv': {
        const csv = convertToCSV(data);
        downloadFile(csv, 'audit-log.csv', 'text/csv');
        break;
      }
      case 'pdf':
        // For demo purposes, we'll just export JSON
        downloadFile(JSON.stringify(data, null, 2), 'audit-log.json', 'application/json');
        break;
    }
  };

  const refreshEvents = async (): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // In real implementation, this would fetch new events
      console.log('Events refreshed');
    }, 1000);
  };

  const loadMoreEvents = async (): Promise<void> => {
    if (!hasMore) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentPage(prev => prev + 1);
      // In real implementation, this would load more events
      if (currentPage >= 5) {
        setHasMore(false);
      }
    }, 1000);
  };

  // Analytics functions
  const getEventById = (id: string): AuditEvent | undefined => {
    return events.find(event => event.id === id);
  };

  const getEventsByUser = (userId: string): AuditEvent[] => {
    return events.filter(event => event.userId === userId);
  };

  const getEventsByResource = (resource: string, resourceId?: string): AuditEvent[] => {
    return events.filter(event => 
      event.resource === resource && 
      (!resourceId || event.resourceId === resourceId)
    );
  };

  const getEventsByTimeRange = (start: Date, end: Date): AuditEvent[] => {
    return events.filter(event => 
      event.timestamp >= start && event.timestamp <= end
    );
  };

  // Security and integrity functions
  const verifyEventIntegrity = (event: AuditEvent): boolean => {
    // Simplified integrity check - in real implementation, this would verify cryptographic hash
    return event.hash === generateEventHash(event);
  };

  const verifyChainIntegrity = (): boolean => {
    // Simplified chain integrity check
    for (let i = 1; i < events.length; i++) {
      if (events[i].previousHash !== events[i - 1].hash) {
        return false;
      }
    }
    return true;
  };

  const getTamperedEvents = (): AuditEvent[] => {
    return events.filter(event => !verifyEventIntegrity(event));
  };

  // UI helper functions
  const getSeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      info: '#2196f3',
      warning: '#ff9800',
      error: '#f44336',
      critical: '#d32f2f',
      debug: '#9e9e9e',
    };
    return colorMap[severity] || '#757575';
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      success: <SuccessIcon color="success" />,
      failure: <ErrorIcon color="error" />,
      pending: <TimeIcon color="disabled" />,
    };
    return iconMap[status] || <InfoIcon />;
  };

  const getSeverityIcon = (severity: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      info: <InfoIcon color="info" />,
      warning: <WarningIcon color="warning" />,
      error: <ErrorIcon color="error" />,
      critical: <ErrorIcon color="error" sx={{ fontSize: 20 }} />,
      debug: <InfoIcon color="disabled" />,
    };
    return iconMap[severity] || <InfoIcon />;
  };

  const formatEventTime = (timestamp: Date): string => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const formatEventDetails = (event: AuditEvent): string => {
    return `${event.username} ${event.action} ${event.resource} (${event.resourceId})`;
  };

  // Advanced analytics functions
  const getUserActivityTimeline = (userId: string): AuditEvent[] => {
    return getEventsByUser(userId).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  };

  const getResourceAccessPattern = (resource: string): AuditEvent[] => {
    return getEventsByResource(resource).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  };

  const detectAnomalies = (threshold: number = 100): AuditEvent[] => {
    // Simple anomaly detection based on frequency
    const userActivity = events.reduce((acc, event) => {
      if (!acc[event.userId]) acc[event.userId] = 0;
      acc[event.userId]++;
      return acc;
    }, {} as Record<string, number>);
    
    const anomalousUsers = Object.entries(userActivity)
      .filter(([, count]) => count > threshold)
      .map(([userId]) => userId);
    
    return events.filter(event => anomalousUsers.includes(event.userId));
  };

  const generateComplianceReport = async (standard: 'SOX' | 'HIPAA' | 'GDPR' | 'PCI-DSS'): Promise<Blob> => {
    const reportData = {
      standard,
      generatedAt: new Date().toISOString(),
      events: filteredEvents.slice(0, 1000),
      metrics,
      integrity: verifyChainIntegrity(),
    };
    
    return new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  };

  // Utility functions
  const generateEventHash = (): string => {
    // Simplified hash generation - in real implementation, use cryptographic hash
    return `hash-${Math.random().toString(36).substr(2, 9)}`;
  };

  const convertToCSV = (data: AuditEvent[]): string => {
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Resource', 'Status', 'Severity'];
    const rows = data.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.username,
      event.action,
      event.resource,
      event.status,
      event.severity,
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadFile = (content: string, filename: string, contentType: string): void => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const contextValue: AuditTrailContextType = {
    events,
    filteredEvents,
    metrics,
    filters,
    searchTerm,
    isLoading,
    hasMore,
    currentPage,
    pageSize,
    logEvent,
    searchEvents,
    filterEvents,
    clearFilters,
    exportEvents,
    refreshEvents,
    loadMoreEvents,
    getEventById,
    getEventsByUser,
    getEventsByResource,
    getEventsByTimeRange,
    verifyEventIntegrity,
    verifyChainIntegrity,
    getTamperedEvents,
    getSeverityColor,
    getStatusIcon,
    getSeverityIcon,
    formatEventTime,
    formatEventDetails,
    getUserActivityTimeline,
    getResourceAccessPattern,
    detectAnomalies,
    generateComplianceReport,
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <HistoryIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Audit Trail
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to view audit events and compliance reports.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <AuditTrailContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        sx={{ width: '100%' }}
      >
        {/* Audit Trail Header */}
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <HistoryIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    Audit Trail
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {filteredEvents.length} of {events.length} events • Chain integrity: {verifyChainIntegrity() ? 'Verified' : 'Compromised'}
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={refreshEvents} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
                <IconButton onClick={() => exportEvents('json')}>
                  <DownloadIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Metrics Overview */}
        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={2} mb={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Events
              </Typography>
              <Typography variant="h4" color="primary.main">
                {metrics.totalEvents.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.uniqueUsers} unique users
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Rate
              </Typography>
              <Typography variant="h4" color={metrics.errorRate > 5 ? 'error.main' : 'success.main'}>
                {metrics.errorRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average response: {metrics.averageResponseTime.toFixed(0)}ms
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Chain Integrity
              </Typography>
              <Chip
                label={verifyChainIntegrity() ? 'Verified' : 'Compromised'}
                color={verifyChainIntegrity() ? 'success' : 'error'}
                icon={verifyChainIntegrity() ? <SuccessIcon /> : <ErrorIcon />}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {getTamperedEvents().length} tampered events
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Search and Filter Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => searchEvents(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 300 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filters.severity || ''}
                  onChange={(e) => filterEvents({ ...filters, severity: e.target.value || undefined })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e) => filterEvents({ ...filters, status: e.target.value || undefined })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failure">Failure</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Resource</InputLabel>
                <Select
                  value={filters.resource || ''}
                  onChange={(e) => filterEvents({ ...filters, resource: e.target.value || undefined })}
                >
                  <MenuItem value="">All Resources</MenuItem>
                  <MenuItem value="bot">Bot</MenuItem>
                  <MenuItem value="config">Config</MenuItem>
                  <MenuItem value="dashboard">Dashboard</MenuItem>
                  <MenuItem value="analytics">Analytics</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                onClick={clearFilters}
                startIcon={<FilterIcon />}
              >
                Clear Filters
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Events ({filteredEvents.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEvents.slice(0, pageSize * currentPage).map((event) => (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TimeIcon fontSize="small" color="disabled" />
                          <Typography variant="body2">
                            {format(event.timestamp, 'MMM dd, HH:mm')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {event.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {event.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.userEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.action}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {event.resource}:{event.resourceId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getStatusIcon(event.status)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.severity}
                          size="small"
                          sx={{
                            backgroundColor: getSeverityColor(event.severity) + '20',
                            color: getSeverityColor(event.severity),
                            borderColor: getSeverityColor(event.severity),
                          }}
                          icon={getSeverityIcon(event.severity)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {event.ipAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }}>
                          {event.details.message}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {hasMore && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  onClick={loadMoreEvents}
                  disabled={isLoading}
                  variant="outlined"
                >
                  {isLoading ? 'Loading...' : 'Load More Events'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </AnimatedBox>
    </AuditTrailContext.Provider>
  );
};

// Export types
export type { AuditEvent, AuditFilter, AuditMetrics, AuditTrailContextType };
export { AuditTrailContext };

export default AuditTrailProvider;