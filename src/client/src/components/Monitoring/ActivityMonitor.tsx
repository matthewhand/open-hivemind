/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button, Loading, EmptyState } from '../DaisyUI';
import DataTable from '../DaisyUI/DataTable';
import SearchFilterBar from '../SearchFilterBar';
import dayjs from 'dayjs';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiService, ActivityEvent } from '../../services/api';
import { Activity, Clock } from 'lucide-react';

interface FilterOptions {
  agent?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  messageType?: 'incoming' | 'outgoing';
  status?: 'success' | 'error' | 'timeout';
}

const ActivityMonitor: React.FC = () => {
  const { messages: wsMessages, metrics } = useWebSocket();
  const [historyMessages, setHistoryMessages] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});

  // Initial data fetch
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await apiService.getActivity({ limit: '100' } as any);
        if (response && response.events) {
          setHistoryMessages(response.events);
        }
      } catch (error) {
        console.error('Failed to fetch activity history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Combine history and realtime messages
  const allMessages = useMemo(() => {
    // Merge history and wsMessages, deduping by ID if necessary
    // WS messages are likely newer.
    // Ideally we merge them. For now, let's just use history + wsMessages
    // Assuming wsMessages accumulates new messages.

    // Create a map by ID to dedupe
    const messageMap = new Map<string, ActivityEvent>();

    // Add history first
    historyMessages.forEach(msg => messageMap.set(msg.id, msg));

    // Add/Update with WS messages
    // We need to cast WS messages to ActivityEvent if they are compatible
    // The interfaces are slightly different in strictness but mostly compatible
    wsMessages.forEach((msg: any) => messageMap.set(msg.id, msg));

    return Array.from(messageMap.values()).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [historyMessages, wsMessages]);

  const uniqueAgents = useMemo(() => Array.from(new Set(allMessages.map(msg => msg.botName))), [allMessages]);
  const uniqueProviders = useMemo(() => Array.from(new Set(allMessages.map(msg => msg.provider))), [allMessages]);

  const filteredMessages = useMemo(() => {
    let filtered = [...allMessages];

    // Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.botName?.toLowerCase().includes(lowerQuery) ||
        msg.provider?.toLowerCase().includes(lowerQuery) ||
        msg.errorMessage?.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by agent
    if (filters.agent) {
      filtered = filtered.filter(msg => msg.botName === filters.agent);
    }

    // Filter by provider
    if (filters.provider) {
      filtered = filtered.filter(msg => msg.provider === filters.provider);
    }

    // Filter by message type
    if (filters.messageType) {
      filtered = filtered.filter(msg => msg.messageType === filters.messageType);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(msg => msg.status === filters.status);
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(msg => dayjs(msg.timestamp).isAfter(dayjs(filters.startDate)));
    }

    if (filters.endDate) {
      filtered = filtered.filter(msg => dayjs(msg.timestamp).isBefore(dayjs(filters.endDate)));
    }

    return filtered;
  }, [allMessages, searchQuery, filters]);

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  // Calculate statistics
  const totalMessages = filteredMessages.length;
  const incomingMessages = filteredMessages.filter(msg => msg.messageType === 'incoming').length;
  const outgoingMessages = filteredMessages.filter(msg => msg.messageType === 'outgoing').length;
  const errorMessages = filteredMessages.filter(msg => msg.status === 'error').length;

  const columns = [
    {
      key: 'timestamp',
      title: 'Time',
      sortable: true,
      width: '180px',
      render: (value: string) => <span className="font-mono text-xs">{dayjs(value).format('YYYY-MM-DD HH:mm:ss')}</span>
    },
    {
      key: 'botName',
      title: 'Agent',
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-medium">{value}</span>
    },
    {
      key: 'provider',
      title: 'Provider',
      sortable: true,
      render: (value: string) => <Badge variant="neutral" size="sm">{value}</Badge>
    },
    {
      key: 'messageType',
      title: 'Type',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={value === 'incoming' ? 'primary' : 'secondary'}
          size="sm"
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'contentLength',
      title: 'Length',
      sortable: true,
      render: (value: number) => <span className="text-xs">{value} chars</span>
    },
    {
      key: 'processingTime',
      title: 'Duration',
      sortable: true,
      render: (value: number) => value ? <span className="font-mono text-xs">{value}ms</span> : '-'
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge
          variant={value === 'success' ? 'success' : value === 'error' ? 'error' : 'warning'}
          size="sm"
        >
          {value}
        </Badge>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Activity Monitoring</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setLoading(true);
            apiService.getActivity({ limit: '100' } as any).then(res => {
              if (res?.events) setHistoryMessages(res.events);
              setLoading(false);
            });
          }}
        >
          Refresh History
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">Total Messages</p>
            <h3 className="text-2xl font-bold">{totalMessages}</h3>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">Incoming</p>
            <h3 className="text-2xl font-bold text-primary">{incomingMessages}</h3>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">Outgoing</p>
            <h3 className="text-2xl font-bold text-secondary">{outgoingMessages}</h3>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <p className="text-base-content/70 text-sm mb-2">Errors</p>
            <h3 className={`text-2xl font-bold ${errorMessages > 0 ? 'text-error' : 'text-success'}`}>
              {errorMessages}
            </h3>
          </Card.Body>
        </Card>
      </div>

      {/* Filter Bar */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search activity..."
        onClear={clearFilters}
        filters={[
          {
            key: 'agent',
            value: filters.agent || '',
            onChange: (val) => handleFilterChange('agent', val || undefined),
            options: [{ value: '', label: 'All Agents' }, ...uniqueAgents.map(a => ({ value: a, label: a }))],
            className: 'w-full sm:w-40'
          },
          {
            key: 'provider',
            value: filters.provider || '',
            onChange: (val) => handleFilterChange('provider', val || undefined),
            options: [{ value: '', label: 'All Providers' }, ...uniqueProviders.map(p => ({ value: p, label: p }))],
            className: 'w-full sm:w-40'
          },
          {
            key: 'status',
            value: filters.status || '',
            onChange: (val) => handleFilterChange('status', val || undefined),
            options: [
              { value: '', label: 'All Statuses' },
              { value: 'success', label: 'Success' },
              { value: 'error', label: 'Error' },
              { value: 'timeout', label: 'Timeout' }
            ],
            className: 'w-full sm:w-32'
          }
        ]}
      >
        <div className="flex gap-2 items-center">
             {/* Simple Date Inputs as children */}
             <input
                type="datetime-local"
                className="input input-bordered input-sm w-36" // narrowed for better fit
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                aria-label="Start Date"
              />
              <span className="text-base-content/50">-</span>
              <input
                type="datetime-local"
                className="input input-bordered input-sm w-36"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                aria-label="End Date"
              />
        </div>
      </SearchFilterBar>

      <div className="mt-6">
        {loading && allMessages.length === 0 ? (
          <div className="flex justify-center p-12">
            <Loading size="lg" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity found"
            description="Adjust your filters or wait for new activity."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <Card>
            <DataTable
              data={filteredMessages}
              columns={columns as any}
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={false} // We use SearchFilterBar
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default ActivityMonitor;
