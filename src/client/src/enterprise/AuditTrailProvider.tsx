import React, { createContext, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  ClockIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const formatDistanceToNow = (date: Date): string => {
  return date.toLocaleString();
};
const format = (date: Date): string => {
  return date.toLocaleDateString();
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
  hash: string;
  previousHash?: string;
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
  events: AuditEvent[];
  filteredEvents: AuditEvent[];
  metrics: AuditMetrics;
  filters: AuditFilter;
  searchTerm: string;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  logEvent: (event: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'>) => Promise<void>;
  searchEvents: (searchTerm: string) => void;
  filterEvents: (filters: AuditFilter) => void;
  clearFilters: () => void;
  exportEvents: (format: 'json' | 'csv' | 'pdf') => Promise<void>;
  refreshEvents: () => Promise<void>;
  loadMoreEvents: () => Promise<void>;
  getEventById: (id: string) => AuditEvent | undefined;
  getEventsByUser: (userId: string) => AuditEvent[];
  getEventsByResource: (resource: string, resourceId?: string) => AuditEvent[];
  getEventsByTimeRange: (start: Date, end: Date) => AuditEvent[];
  verifyEventIntegrity: (event: AuditEvent) => boolean;
  verifyChainIntegrity: () => boolean;
  getTamperedEvents: () => AuditEvent[];
  getSeverityColor: (severity: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getSeverityIcon: (severity: string) => React.ReactNode;
  formatEventTime: (timestamp: Date) => string;
  formatEventDetails: (event: AuditEvent) => string;
  getUserActivityTimeline: (userId: string) => AuditEvent[];
  getResourceAccessPattern: (resource: string) => AuditEvent[];
  detectAnomalies: (threshold?: number) => AuditEvent[];
  generateComplianceReport: (standard: 'SOX' | 'HIPAA' | 'GDPR' | 'PCI-DSS') => Promise<Blob>;
}

const AuditTrailContext = createContext<AuditTrailContextType | undefined>(undefined);

interface AuditTrailProviderProps {
  children: React.ReactNode;
}

export const AuditTrailProvider: React.FC<AuditTrailProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [filters, setFilters] = useState<AuditFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const metrics: AuditMetrics = {
    totalEvents: 0,
    eventsBySeverity: {},
    eventsByStatus: {},
    eventsByResource: {},
    uniqueUsers: 0,
    averageResponseTime: 0,
    errorRate: 0,
    topActions: [],
    timeRange: { start: new Date(), end: new Date() },
  };

  const logEvent = async (eventData: any) => {
    const event = { ...eventData, id: `evt-${Date.now()}`, timestamp: new Date(), hash: 'hash' };
    setEvents(prev => [event, ...prev]);
    setFilteredEvents(prev => [event, ...prev]);
  };
  const searchEvents = (term: string) => { setSearchTerm(term); };
  const filterEvents = (f: AuditFilter) => { setFilters(f); };
  const clearFilters = () => { setFilters({}); setSearchTerm(''); };
  const exportEvents = async (fmt: string) => { };
  const refreshEvents = async () => { };
  const loadMoreEvents = async () => { };

  const getEventById = (id: string) => events.find(e => e.id === id);
  const getEventsByUser = (uid: string) => events.filter(e => e.userId === uid);
  const getEventsByResource = (res: string, rid?: string) => events.filter(e => e.resource === res);
  const getEventsByTimeRange = (s: Date, e: Date) => [];

  const verifyEventIntegrity = (e: AuditEvent) => true;
  const verifyChainIntegrity = () => true;
  const getTamperedEvents = () => [];

  const getSeverityColor = (s: string) => 'info';
  const getStatusIcon = (s: string) => <CheckCircleIcon className="w-5 h-5" />;
  const getSeverityIcon = (s: string) => <InformationCircleIcon className="w-5 h-5" />;
  const formatEventTime = (d: Date) => d.toLocaleString();
  const formatEventDetails = (e: AuditEvent) => e.username;

  const getUserActivityTimeline = (uid: string) => [];
  const getResourceAccessPattern = (r: string) => [];
  const detectAnomalies = () => [];
  const generateComplianceReport = async (s: string) => new Blob([]);

  const contextValue: AuditTrailContextType = {
    events, filteredEvents, metrics, filters, searchTerm,
    isLoading, hasMore, currentPage, pageSize,
    logEvent, searchEvents, filterEvents, clearFilters, exportEvents,
    refreshEvents, loadMoreEvents,
    getEventById, getEventsByUser, getEventsByResource, getEventsByTimeRange,
    verifyEventIntegrity, verifyChainIntegrity, getTamperedEvents,
    getSeverityColor, getStatusIcon, getSeverityIcon,
    formatEventTime, formatEventDetails,
    getUserActivityTimeline, getResourceAccessPattern,
    detectAnomalies, generateComplianceReport,
  };

  return (
    <AuditTrailContext.Provider value={contextValue}>
      {children}
    </AuditTrailContext.Provider>
  );
};

export default AuditTrailProvider;
export { AuditTrailContext };