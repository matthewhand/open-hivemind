/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Download, LayoutList, GitBranch, RefreshCw, Eye } from 'lucide-react';
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
  Modal,
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
  errorMessage?: string;
  // Legacy fields kept for compatibility if needed, but primary is now processingTime/contentLength
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

const EventDetailsModal: React.FC<{
  event: ActivityEvent | null;
  onClose: () => void;
}> = ({ event, onClose }) => {
  if (!event) return null;

  return (
    <Modal
      isOpen={!!event}
      title="Event Details"
      onClose={onClose}
      actions={[{ label: 'Close', onClick: onClose, variant: 'primary' }]}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">ID</span>
            <span className="font-mono text-sm break-all">{event.id}</span>
          </div>
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">Timestamp</span>
            <span className="font-mono text-sm">{new Date(event.timestamp).toLocaleString()}</span>
          </div>
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">Bot</span>
            <span className="font-medium">{event.botName}</span>
          </div>
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">Status</span>
            <span className={`badge ${event.status === 'success' ? 'badge-success' : event.status === 'error' ? 'badge-error' : 'badge-warning'}`}>
              {event.status}
            </span>
          </div>
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">Provider</span>
            <Badge variant="neutral" size="sm">{event.provider}</Badge>
          </div>
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">LLM Provider</span>
            <Badge variant="primary" size="sm" style="outline">{event.llmProvider}</Badge>
          </div>
           <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">Processing Time</span>
            <span className="font-mono">{event.processingTime ? `${event.processingTime}ms` : '-'}</span>
          </div>
          <div>
            <span className="font-bold block text-xs uppercase text-base-content/70">Content Length</span>
            <span className="font-mono">{event.contentLength ?? '-'} chars</span>
          </div>
        </div>

        {event.errorMessage && (
           <div className="alert alert-error text-sm">
             <span className="font-bold">Error:</span> {event.errorMessage}
           </div>
        )}

        <div className="collapse collapse-arrow bg-base-200 border border-base-300 rounded-box">
          <input type="checkbox" />
          <div className="collapse-title font-medium text-sm">
            Raw Event Data
          </div>
          <div className="collapse-content">
            <pre className="text-xs overflow-x-auto p-2 bg-base-300 rounded font-mono leading-relaxed">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </Modal>
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

  const rawEvents = data?.events || [];

  // Apply local filtering
  const events = rawEvents.filter(event => {
    if (statusFilter !== 'all' && event.status !== statusFilter) return false;
    return true;
  });

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
      title: 'Time (ms)',
      sortable: true,
      width: '100px',
      render: (value: number) => value ? <span className="font-mono">{value}ms</span> : '-',
    },
    {
      key: 'contentLength' as keyof ActivityEvent,
      title: 'Size',
      sortable: true,
      width: '80px',
      render: (value: number) => value ? <span className="font-mono">{value}</span> : '-',
    },
    {
      key: 'id' as keyof ActivityEvent, // Dummy key for actions
      title: 'Actions',
      width: '80px',
      render: (_: any, record: ActivityEvent) => (
        <Button
          size="xs"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEvent(record);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    }
  ];

  const stats = [
    {
      id: 'total',
      title: 'Total Events',
      value: rawEvents.length,
      icon: '📊',
      color: 'primary' as const,
    },
    {
      id: 'success',
      title: 'Successful',
      value: rawEvents.filter(e => e.status === 'success').length,
      icon: '✅',
      color: 'success' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: rawEvents.filter(e => e.status === 'error' || e.status === 'timeout').length,
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
      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

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
            <select
              className="select select-sm select-bordered"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="timeout">Timeout</option>
              <option value="pending">Pending</option>
            </select>

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
      {loading && rawEvents.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity found"
          description={statusFilter !== 'all' ? `No events with status "${statusFilter}"` : "Events will appear here as your bots process messages"}
        />
      ) : (
        <Card>
          {viewMode === 'table' ? (
            <DataTable
              data={events}
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