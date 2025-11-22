import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
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
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'error',
      debug: 'neutral',
    };
    return colorMap[severity] || 'neutral';
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      success: <CheckCircleIcon className="w-5 h-5 text-success" />,
      failure: <XCircleIcon className="w-5 h-5 text-error" />,
      pending: <ClockIcon className="w-5 h-5 text-neutral" />,
    };
    return iconMap[status] || <InformationCircleIcon className="w-5 h-5" />;
  };

  const getSeverityIcon = (severity: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      info: <InformationCircleIcon className="w-5 h-5 text-info" />,
      warning: <ExclamationTriangleIcon className="w-5 h-5 text-warning" />,
      error: <XCircleIcon className="w-5 h-5 text-error" />,
      critical: <XCircleIcon className="w-5 h-5 text-error font-bold" />,
      debug: <InformationCircleIcon className="w-5 h-5 text-neutral" />,
    };
    return iconMap[severity] || <InformationCircleIcon className="w-5 h-5" />;
  };

  const formatEventTime = (timestamp: Date): string => {
    return formatDistanceToNow(timestamp);
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
  const generateEventHash = (event: any): string => {
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
        animation="fade-in"
        duration={300}
      >
        <div className="p-6 flex justify-center items-center min-h-[400px]">
          <div className="card bg-base-100 shadow-xl max-w-sm text-center">
            <div className="card-body items-center">
              <ClockIcon className="w-16 h-16 text-primary mb-4" />
              <h2 className="card-title text-2xl mb-2">Audit Trail</h2>
              <p className="text-base-content/70">
                Please log in to view audit events and compliance reports.
              </p>
            </div>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <AuditTrailContext.Provider value={contextValue}>
      <AnimatedBox
        animation="fade-in"
        duration={300}
      >
        <div className="w-full">
          {/* Audit Trail Header */}
          <div className="card bg-base-100 shadow-xl mb-6 border-l-4 border-primary">
            <div className="card-body">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <ClockIcon className="w-8 h-8 text-primary" />
                  <div>
                    <h2 className="card-title text-xl">
                      Audit Trail
                    </h2>
                    <p className="text-sm text-base-content/70">
                      {filteredEvents.length} of {events.length} events • Chain integrity: {verifyChainIntegrity() ? 'Verified' : 'Compromised'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-ghost btn-circle"
                    onClick={refreshEvents}
                    disabled={isLoading}
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    className="btn btn-ghost btn-circle"
                    onClick={() => exportEvents('json')}
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Total Events</h3>
                <div className="text-3xl font-bold text-primary">
                  {metrics.totalEvents.toLocaleString()}
                </div>
                <div className="text-sm text-base-content/70">
                  {metrics.uniqueUsers} unique users
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Error Rate</h3>
                <div className={`text-3xl font-bold ${metrics.errorRate > 5 ? 'text-error' : 'text-success'}`}>
                  {metrics.errorRate.toFixed(1)}%
                </div>
                <div className="text-sm text-base-content/70">
                  Average response: {metrics.averageResponseTime.toFixed(0)}ms
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-lg mb-2">Chain Integrity</h3>
                <div className={`badge ${verifyChainIntegrity() ? 'badge-success' : 'badge-error'} gap-2`}>
                  {verifyChainIntegrity() ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                  {verifyChainIntegrity() ? 'Verified' : 'Compromised'}
                </div>
                <div className="text-sm text-base-content/70 mt-2">
                  {getTamperedEvents().length} tampered events
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <div className="flex flex-wrap gap-4">
                <div className="form-control flex-1 min-w-[200px]">
                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Search events..."
                      className="input input-bordered w-full"
                      value={searchTerm}
                      onChange={(e) => searchEvents(e.target.value)}
                    />
                    <button className="btn btn-square">
                      <MagnifyingGlassIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <select
                  className="select select-bordered w-full max-w-xs"
                  value={filters.severity || ''}
                  onChange={(e) => filterEvents({ ...filters, severity: e.target.value || undefined })}
                >
                  <option value="">All Severities</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>

                <select
                  className="select select-bordered w-full max-w-xs"
                  value={filters.status || ''}
                  onChange={(e) => filterEvents({ ...filters, status: e.target.value || undefined })}
                >
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="pending">Pending</option>
                </select>

                <select
                  className="select select-bordered w-full max-w-xs"
                  value={filters.resource || ''}
                  onChange={(e) => filterEvents({ ...filters, resource: e.target.value || undefined })}
                >
                  <option value="">All Resources</option>
                  <option value="bot">Bot</option>
                  <option value="config">Config</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="analytics">Analytics</option>
                  <option value="user">User</option>
                  <option value="system">System</option>
                </select>

                <button
                  className="btn btn-outline gap-2"
                  onClick={clearFilters}
                >
                  <FunnelIcon className="w-5 h-5" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                Recent Events ({filteredEvents.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Status</th>
                      <th>Severity</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.slice(0, pageSize * currentPage).map((event) => (
                      <tr key={event.id} className="hover">
                        <td>
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-base-content/50" />
                            <span className="text-sm">
                              {format(event.timestamp)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded-full w-8">
                                <span className="text-xs">{event.username.charAt(0).toUpperCase()}</span>
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-sm">{event.username}</div>
                              <div className="text-xs opacity-50">{event.userEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="font-medium">{event.action}</div>
                        </td>
                        <td>
                          <div className="badge badge-ghost">{event.resource}</div>
                        </td>
                        <td>
                          {getStatusIcon(event.status)}
                        </td>
                        <td>
                          <div className={`badge badge-${getSeverityColor(event.severity)} gap-1`}>
                            {getSeverityIcon(event.severity)}
                            {event.severity}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm truncate max-w-xs" title={formatEventDetails(event)}>
                            {formatEventDetails(event)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                    onClick={loadMoreEvents}
                    disabled={isLoading}
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </AnimatedBox>
    </AuditTrailContext.Provider>
  );
};

export default AuditTrailProvider;

// Export types for external use
export type { AuditTrailContextType };