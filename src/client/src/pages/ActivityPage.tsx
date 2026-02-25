/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Download, LayoutList, GitBranch, RefreshCw } from 'lucide-react';
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
  messageType?: 'incoming' | 'outgoing';
  // Legacy fields fallback
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
      render: (value: number) => value ? <span className="font-mono">{value}B</span> : '-',
    },
  ];

  const filteredEvents = events.filter(event => {
    if (statusFilter !== 'all' && event.status !== statusFilter) return false;
    return true;
  });

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
            <select
              className="select select-bordered select-sm"
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
              className="cursor-pointer"
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

      {/* Event Details Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Event Details"
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm mb-1">Timestamp</h4>
                <p className="font-mono text-sm">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedEvent.status)}
                  {selectedEvent.processingTime && (
                    <span className="text-sm opacity-70">({selectedEvent.processingTime}ms)</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Bot</h4>
                <p>{selectedEvent.botName}</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Providers</h4>
                <div className="flex gap-2">
                  <Badge variant="neutral" size="sm">{selectedEvent.provider}</Badge>
                  <Badge variant="primary" size="sm" style="outline">{selectedEvent.llmProvider}</Badge>
                </div>
              </div>
            </div>

            {selectedEvent.errorMessage && (
              <Alert status="error" message={selectedEvent.errorMessage} />
            )}

            <div className="divider text-xs opacity-50">Raw Data</div>

            <div className="mockup-code bg-base-300 text-base-content p-4 rounded-lg overflow-x-auto max-h-96">
              <pre className="text-xs font-mono">
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>

            <div className="modal-action">
              <Button onClick={() => setSelectedEvent(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActivityPage;