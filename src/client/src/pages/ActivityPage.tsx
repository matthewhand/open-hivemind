/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Download, LayoutList, GitBranch, RefreshCw, Filter } from 'lucide-react';
import { 
  Alert, 
  Badge, 
  Button, 
  Card, 
  DataTable, 
  StatsCards, 
  Timeline, 
  Toggle,
  PageHeader,
  LoadingSpinner,
  EmptyState,
} from '../components/DaisyUI';

interface ActivityEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider: string;
  status: 'success' | 'error' | 'timeout' | 'pending';
  processingTime?: number;
  contentLength?: number;
  messageType?: 'incoming' | 'outgoing';
  errorMessage?: string;
  // Keep legacy fields just in case
  duration?: number;
  inputLength?: number;
  outputLength?: number;
}

interface ActivityResponse {
  events: ActivityEvent[];
  filters: {
    agents: string[];
    messageProviders: string[];
    llmProviders: string[];
  };
  timeline: any[];
  agentMetrics: any[];
}

const API_BASE = '/api';

const EventDetailsModal: React.FC<{ event: ActivityEvent | null, onClose: () => void }> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl">
        <h3 className="font-bold text-lg mb-4">Event Details</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm opacity-70">Event ID</div>
              <div className="font-mono text-sm break-all">{event.id}</div>
            </div>
            <div>
              <div className="text-sm opacity-70">Timestamp</div>
              <div>{new Date(event.timestamp).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm opacity-70">Bot Name</div>
              <div className="font-bold">{event.botName}</div>
            </div>
             <div>
              <div className="text-sm opacity-70">Status</div>
              <div>
                <Badge variant={event.status === 'success' ? 'success' : event.status === 'error' ? 'error' : 'warning'}>
                  {event.status}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm opacity-70">Message Provider</div>
              <div>{event.provider}</div>
            </div>
            <div>
              <div className="text-sm opacity-70">LLM Provider</div>
              <div>{event.llmProvider}</div>
            </div>
            {event.processingTime !== undefined && (
              <div>
                <div className="text-sm opacity-70">Processing Time</div>
                <div>{event.processingTime}ms</div>
              </div>
            )}
            {event.contentLength !== undefined && (
               <div>
                <div className="text-sm opacity-70">Content Length</div>
                <div>{event.contentLength} chars</div>
              </div>
            )}
             {event.errorMessage && (
               <div className="col-span-2">
                <div className="text-sm opacity-70 text-error">Error Message</div>
                <div className="text-error font-medium">{event.errorMessage}</div>
              </div>
            )}
          </div>

          <div className="divider">Raw Data</div>
          <div className="bg-base-200 p-4 rounded-lg overflow-x-auto">
            <pre className="text-xs font-mono">
                {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};


const ActivityPage: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/dashboard/api/activity`);

      if (!response.ok) {
        throw new Error(`Failed to fetch activity: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity';
      setError(message);
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchActivity, autoRefresh]);

  const events = data?.events || [];

  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return events;
    return events.filter(e => e.status === statusFilter);
  }, [events, statusFilter]);

  const timelineEvents = events.map(event => ({
    id: event.id || `${event.timestamp}-${event.botName}`,
    timestamp: new Date(event.timestamp),
    title: `${event.botName}: ${event.status}`,
    description: `Provider: ${event.provider} | LLM: ${event.llmProvider}`,
    type: event.status === 'error' || event.status === 'timeout' ? 'error' as const :
      event.status === 'success' ? 'success' as const : 'info' as const,
    metadata: { ...event },
  }));

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'primary'> = {
      success: 'success',
      error: 'error',
      timeout: 'warning',
      pending: 'primary',
    };
    return <Badge variant={variants[status] || 'primary'} size="sm">{status}</Badge>;
  };

  const columns = [
    {
      key: 'timestamp' as keyof ActivityEvent,
      title: 'Time',
      sortable: true,
      width: '180px',
      render: (value: string) => <span className="font-mono text-sm">{new Date(value).toLocaleString()}</span>,
    },
    {
      key: 'botName' as keyof ActivityEvent,
      title: 'Bot',
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'status' as keyof ActivityEvent,
      title: 'Status',
      sortable: true,
      filterable: true,
      width: '100px',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'provider' as keyof ActivityEvent,
      title: 'Provider',
      sortable: true,
      filterable: true,
      render: (value: string) => <Badge variant="neutral" size="sm">{value}</Badge>,
    },
    {
      key: 'llmProvider' as keyof ActivityEvent,
      title: 'LLM',
      sortable: true,
      filterable: true,
      render: (value: string) => <Badge variant="primary" size="sm" style="outline">{value}</Badge>,
    },
    {
      key: 'processingTime' as keyof ActivityEvent,
      title: 'Duration',
      sortable: true,
      width: '100px',
      render: (value: number | undefined) => value ? <span className="font-mono">{value}ms</span> : '-',
    },
    {
        key: 'contentLength' as keyof ActivityEvent,
        title: 'Size',
        sortable: true,
        width: '80px',
        render: (value: number | undefined) => value ? <span className="font-mono text-xs">{value}B</span> : '-',
    }
  ];

  const stats = [
    {
      id: 'total',
      title: 'Total Events',
      value: events.length,
      icon: '📊',
      color: 'primary' as const,
    },
    {
      id: 'success',
      title: 'Successful',
      value: events.filter(e => e.status === 'success').length,
      icon: '✅',
      color: 'success' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: events.filter(e => e.status === 'error' || e.status === 'timeout').length,
      icon: '❌',
      color: 'error' as const,
    },
    {
      id: 'bots',
      title: 'Active Bots',
      value: data?.filters?.agents?.length || 0,
      icon: '🤖',
      color: 'secondary' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      {/* Error Alert */}
      {error && (
        <Alert 
          status="error" 
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Activity Feed"
        description="Real-time message flow and events"
        icon={Clock}
        actions={
          <div className="flex items-center gap-2">
             {/* Status Filter */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-sm btn-ghost gap-2">
                 <Filter className="w-4 h-4" />
                 {statusFilter === 'all' ? 'All Status' : statusFilter}
              </div>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><a className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>All Status</a></li>
                <li><a className={statusFilter === 'success' ? 'active' : ''} onClick={() => setStatusFilter('success')}>Success</a></li>
                <li><a className={statusFilter === 'error' ? 'active' : ''} onClick={() => setStatusFilter('error')}>Error</a></li>
                <li><a className={statusFilter === 'timeout' ? 'active' : ''} onClick={() => setStatusFilter('timeout')}>Timeout</a></li>
              </ul>
            </div>

            {/* View Toggle */}
            <div className="join">
              <Button 
                size="sm" 
                variant={viewMode === 'table' ? 'primary' : 'ghost'}
                className="join-item"
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="w-4 h-4" /> Table
              </Button>
              <Button 
                size="sm" 
                variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
                className="join-item"
                onClick={() => setViewMode('timeline')}
              >
                <GitBranch className="w-4 h-4" /> Timeline
              </Button>
            </div>
            
            {/* Auto Refresh Toggle */}
            <Toggle 
              label="Auto"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="sm"
            />
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchActivity}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={loading} />

      {/* Content */}
      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity yet"
          description="Events will appear here as your bots process messages"
        />
      ) : (
        <Card>
          {viewMode === 'table' ? (
            <DataTable
              data={filteredEvents}
              columns={columns}
              loading={loading}
              pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={true}
              exportable={true}
              onRowClick={(record) => setSelectedEvent(record)}
            />
          ) : (
            <div className="p-4">
              <Timeline
                events={timelineEvents}
                viewMode="detailed"
                showTimestamps={true}
                maxEvents={100}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ActivityPage;