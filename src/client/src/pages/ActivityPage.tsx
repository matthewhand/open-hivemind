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
} from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import { apiService, ActivityEvent, ActivityResponse } from '../services/api';

const ActivityPage: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filters
  const [selectedBot, setSelectedBot] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedLlmProvider, setSelectedLlmProvider] = useState('all');
  const [availableFilters, setAvailableFilters] = useState<ActivityResponse['filters'] | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      // Construct params
      const params: any = {};
      if (selectedBot !== 'all') params.bot = selectedBot;
      if (selectedProvider !== 'all') params.messageProvider = selectedProvider;
      if (selectedLlmProvider !== 'all') params.llmProvider = selectedLlmProvider;

      const result = await apiService.getActivity(params);
      setData(result);

      // Store initial filters if not set
      if (!availableFilters && result.filters) {
        setAvailableFilters(result.filters);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity';
      setError(message);
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  }, [availableFilters, selectedBot, selectedProvider, selectedLlmProvider]);

  useEffect(() => {
    fetchActivity();

    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchActivity, autoRefresh]);

  const handleExport = () => {
    if (!data?.events || data.events.length === 0) return;

    const headers = ['Timestamp', 'Bot', 'Provider', 'LLM', 'Status', 'Duration (ms)', 'Message Type'];
    const rows = data.events.map(e => [
      e.timestamp,
      e.botName,
      e.provider,
      e.llmProvider,
      e.status,
      e.processingTime || '',
      e.messageType
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_export_${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
      render: (value: number) => value ? <span className="font-mono">{value}ms</span> : '-',
    },
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
      value: availableFilters?.agents?.length || 0,
      icon: '🤖',
      color: 'secondary' as const,
    },
  ];

  // Prepare filter options
  const botOptions = [
    { value: 'all', label: 'All Bots' },
    ...(availableFilters?.agents?.map(a => ({ value: a, label: a })) || [])
  ];

  const providerOptions = [
    { value: 'all', label: 'All Platforms' },
    ...(availableFilters?.messageProviders?.map(p => ({ value: p, label: p })) || [])
  ];

  const llmOptions = [
    { value: 'all', label: 'All LLMs' },
    ...(availableFilters?.llmProviders?.map(p => ({ value: p, label: p })) || [])
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
            
            <Button variant="ghost" size="sm" onClick={handleExport} disabled={loading || events.length === 0}>
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={loading} />

      {/* Filters */}
      <SearchFilterBar
        searchValue="" // Not using text search right now, or could map to generic search
        onSearchChange={() => {}} // No-op for now
        searchPlaceholder="Filter activity..."
        className="hidden sm:flex" // Hide generic search input via CSS if not needed, or just keep it minimal
        filters={[
          {
            key: 'bot',
            value: selectedBot,
            onChange: setSelectedBot,
            options: botOptions,
            className: "w-full sm:w-auto min-w-[150px]"
          },
          {
            key: 'provider',
            value: selectedProvider,
            onChange: setSelectedProvider,
            options: providerOptions,
            className: "w-full sm:w-auto min-w-[150px]"
          },
          {
            key: 'llm',
            value: selectedLlmProvider,
            onChange: setSelectedLlmProvider,
            options: llmOptions,
            className: "w-full sm:w-auto min-w-[150px]"
          }
        ]}
      />

      {/* Content */}
      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity found"
          description="Try adjusting your filters or checking back later"
          variant="noResults"
          actionLabel="Clear Filters"
          onAction={() => {
            setSelectedBot('all');
            setSelectedProvider('all');
            setSelectedLlmProvider('all');
          }}
        />
      ) : (
        <Card>
          {viewMode === 'table' ? (
            <DataTable
              data={events}
              columns={columns}
              loading={loading}
              pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={true} // Client-side search within the page
              exportable={false} // We have a custom export button
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
