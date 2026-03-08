/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, DataTable, LoadingSpinner, EmptyState, StatsCards } from '../DaisyUI';
import SearchFilterBar from '../SearchFilterBar';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiService, ActivityEvent, ActivityResponse } from '../../services/api';
import { Clock, Activity, AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';

interface FilterOptions {
  agent?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
  messageType?: 'incoming' | 'outgoing';
  status?: 'success' | 'error' | 'timeout';
}

const ActivityMonitor: React.FC = () => {
  const { messages: wsMessages } = useWebSocket();
  const [initialMessages, setInitialMessages] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cache filter options
  const [availableFilters, setAvailableFilters] = useState<{
    agents: string[];
    providers: string[];
  }>({ agents: [], providers: [] });

  const fetchActivity = async () => {
    setLoading(true);
    try {
      // Fetch initial data via API
      const result = await apiService.getActivity({
        // We fetch a decent amount to populate the initial view
        // Ideally we'd implement server-side filtering, but for now we'll fetch recent and filter client-side
        // to match the existing WS behavior, or better yet, fetch filtered.
        // Let's just fetch recent 100
      });

      if (result && result.events) {
        setInitialMessages(result.events);

        // Extract unique agents and providers for filters if not already set
        const agents = result.filters?.agents || Array.from(new Set(result.events.map(e => e.botName)));
        const providers = result.filters?.messageProviders || Array.from(new Set(result.events.map(e => e.provider)));

        setAvailableFilters({
          agents,
          providers
        });
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch activity:', err);
      setError('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  // Merge initial API messages with live WS messages
  // We prioritize WS messages for updates, but keep history
  // Since WS messages arrive as they happen, we prepend them?
  // Or replace if ID matches?
  // Simplified: Combine and dedup by ID.
  const allMessages = React.useMemo(() => {
    const messageMap = new Map<string, any>();

    // Add initial messages
    initialMessages.forEach(msg => messageMap.set(msg.id, msg));

    // Add/Update with WS messages
    // Note: useWebSocket messages might have slightly different interface, check types
    wsMessages.forEach((msg: any) => messageMap.set(msg.id, msg));

    return Array.from(messageMap.values()).sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [initialMessages, wsMessages]);

  // Filter messages
  const filteredMessages = React.useMemo(() => {
    return allMessages.filter(msg => {
      // Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          msg.botName.toLowerCase().includes(query) ||
          msg.provider.toLowerCase().includes(query) ||
          (msg.errorMessage && msg.errorMessage.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Dropdowns
      if (selectedAgent !== 'all' && msg.botName !== selectedAgent) return false;
      if (selectedProvider !== 'all' && msg.provider !== selectedProvider) return false;
      if (selectedStatus !== 'all' && msg.status !== selectedStatus) return false;
      if (selectedType !== 'all' && msg.messageType !== selectedType) return false;

      // Dates
      if (startDate && new Date(msg.timestamp) < new Date(startDate)) return false;
      if (endDate && new Date(msg.timestamp) > new Date(endDate)) return false;

      return true;
    });
  }, [allMessages, searchQuery, selectedAgent, selectedProvider, selectedStatus, selectedType, startDate, endDate]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedAgent('all');
    setSelectedProvider('all');
    setSelectedStatus('all');
    setSelectedType('all');
    setStartDate('');
    setEndDate('');
  };

  // Stats
  const stats = [
    {
      id: 'total',
      title: 'Total Messages',
      value: filteredMessages.length,
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'primary' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: filteredMessages.filter(m => m.status === 'error').length,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'error' as const, // 'error' is valid for Badge/Button but maybe not StatsCards? Checking StatsCards props... usually accepts 'primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'
    },
    {
      id: 'activity',
      title: 'Active Agents',
      value: new Set(filteredMessages.map(m => m.botName)).size,
      icon: <Activity className="w-6 h-6" />,
      color: 'secondary' as const,
    }
  ];

  const columns = [
    {
      key: 'timestamp',
      title: 'Time',
      sortable: true,
      width: '180px',
      render: (value: string) => <span className="font-mono text-xs">{new Date(value).toLocaleString()}</span>,
    },
    {
      key: 'botName',
      title: 'Agent',
      sortable: true,
      filterable: true,
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'provider',
      title: 'Provider',
      sortable: true,
      filterable: true,
      render: (value: string) => <Badge variant="neutral" size="sm">{value}</Badge>,
    },
    {
      key: 'messageType',
      title: 'Type',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <Badge variant={value === 'incoming' ? 'primary' : 'secondary'} size="sm">
          {value}
        </Badge>
      ),
    },
    {
      key: 'contentLength',
      title: 'Length',
      width: '80px',
      render: (value: number) => <span className="text-xs">{value} chars</span>,
    },
    {
      key: 'processingTime',
      title: 'Duration',
      width: '100px',
      render: (value: number) => value ? <span className="font-mono text-xs">{value}ms</span> : '-',
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <Badge
          variant={value === 'success' ? 'success' : value === 'error' ? 'error' : 'warning'}
          size="sm"
        >
          {value}
        </Badge>
      ),
    },
  ];

  const agentOptions = [
    { value: 'all', label: 'All Agents' },
    ...availableFilters.agents.map(a => ({ value: a, label: a }))
  ];

  const providerOptions = [
    { value: 'all', label: 'All Providers' },
    ...availableFilters.providers.map(p => ({ value: p, label: p }))
  ];

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'success', label: 'Success' },
    { value: 'error', label: 'Error' },
    { value: 'timeout', label: 'Timeout' },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'incoming', label: 'Incoming' },
    { value: 'outgoing', label: 'Outgoing' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" /> Activity Monitor
        </h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchActivity}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <StatsCards stats={stats} />

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search activity..."
        onClear={handleClearFilters}
        filters={[
          {
            key: 'agent',
            value: selectedAgent,
            onChange: setSelectedAgent,
            options: agentOptions,
            className: "w-full sm:w-1/5"
          },
          {
            key: 'provider',
            value: selectedProvider,
            onChange: setSelectedProvider,
            options: providerOptions,
            className: "w-full sm:w-1/5"
          },
          {
            key: 'status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: statusOptions,
            className: "w-full sm:w-1/5"
          },
          {
            key: 'type',
            value: selectedType,
            onChange: setSelectedType,
            options: typeOptions,
            className: "w-full sm:w-1/5"
          }
        ]}
      >
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input input-sm input-bordered"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <span className="text-base-content/50">-</span>
          <input
            type="date"
            className="input input-sm input-bordered"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
        </div>
      </SearchFilterBar>

      {loading && !allMessages.length ? (
         <div className="flex justify-center py-12">
           <LoadingSpinner size="lg" />
         </div>
      ) : filteredMessages.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity found"
          description="Try adjusting your filters or check back later."
          actionLabel="Refresh"
          onAction={fetchActivity}
        />
      ) : (
        <Card className="shadow-sm">
          <DataTable
            data={filteredMessages}
            columns={columns}
            pagination={{ pageSize: 15 }}
            searchable={false} // Handled by SearchFilterBar
            loading={loading}
          />
        </Card>
      )}
    </div>
  );
};

export default ActivityMonitor;
