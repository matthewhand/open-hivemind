/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Download, LayoutList, GitBranch, RefreshCw, X } from 'lucide-react';
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
  Input,
} from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import { apiService, ActivityEvent, ActivityResponse } from '../services/api';

const ActivityPage: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cache initial filters to populate dropdowns even when filtered
  const [availableFilters, setAvailableFilters] = useState<ActivityResponse['filters'] | null>(null);

  // Enhanced error handling with retry logic
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1000); // 1 second initial delay

  /**
   * Fetch activity data with exponential backoff retry logic
   * - Retries up to 3 times for network/timeout errors
   * - Uses exponential backoff (1s, 2s, 4s delays)
   * - Resets retry state on success
   */

  const fetchActivity = useCallback(async () => {
    const shouldRetry = retryCount < maxRetries;
    try {
      // Exponential backoff retry logic
      const currentDelay = shouldRetry ? retryDelay * Math.pow(2, retryCount) : 0;

      if (currentDelay > 0) {
        console.log(`Retrying fetchActivity in ${currentDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }

      // Don't set loading on auto-refresh to avoid flickering
      if (!autoRefresh) setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedBot !== 'all') params.bot = selectedBot;
      if (selectedProvider !== 'all') params.messageProvider = selectedProvider;
      if (selectedLlmProvider !== 'all') params.llmProvider = selectedLlmProvider;
      if (startDate) params.from = new Date(startDate).toISOString();
      if (endDate) params.to = new Date(endDate).toISOString();

      const result = await apiService.getActivity(params);
      setData(result);

      // Store initial filters
      if (result.filters) {
        setAvailableFilters(prev => prev || result.filters);
      }

      // Reset retry state on success
      setRetryCount(0);
      setRetryDelay(1000);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity';
      setError(message);
      console.error('Error fetching activity:', err);

      // Implement retry logic for transient errors
      if (shouldRetry && (err.message && (err.message.includes('network') || err.message.includes('timeout')))) {
        setRetryCount(prev => prev + 1);
        setRetryDelay(prev => prev * 2); // Exponential backoff
        fetchActivity(); // Retry immediately
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBot, selectedProvider, selectedLlmProvider, startDate, endDate, autoRefresh, retryCount, maxRetries, retryDelay]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]); // fetchActivity depends on filters, so this runs when filters change

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedBot('all');
    setSelectedProvider('all');
    setSelectedLlmProvider('all');
    setStartDate('');
    setEndDate('');
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchActivity]);

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

  // Filter events client-side based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const lowerQuery = searchQuery.toLowerCase();
    return events.filter(e =>
      e.botName.toLowerCase().includes(lowerQuery) ||
      e.provider.toLowerCase().includes(lowerQuery) ||
      e.llmProvider.toLowerCase().includes(lowerQuery) ||
      e.status.toLowerCase().includes(lowerQuery) ||
      (e.errorMessage && e.errorMessage.toLowerCase().includes(lowerQuery))
    );
  }, [events, searchQuery]);

  const timelineEvents = filteredEvents.map(event => ({
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
    return <Badge variant={variants[status] || 'primary'} size="small">{status}</Badge>;
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
      render: (value: string) => <Badge variant="neutral" size="small">{value}</Badge>,
    },
    {
      key: 'llmProvider' as keyof ActivityEvent,
      title: 'LLM',
      sortable: true,
      filterable: true,
      render: (value: string) => <Badge variant="primary" size="small" style="outline">{value}</Badge>,
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

  // Construct filter options
  const botOptions = [
    { value: 'all', label: 'All Bots' },
    ...(availableFilters?.agents || []).map(agent => ({ value: agent, label: agent }))
  ];

  const providerOptions = [
    { value: 'all', label: 'All Providers' },
    ...(availableFilters?.messageProviders || []).map(p => ({ value: p, label: p }))
  ];

  const llmOptions = [
    { value: 'all', label: 'All LLMs' },
    ...(availableFilters?.llmProviders || []).map(p => ({ value: p, label: p }))
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

      {/* Retry Button if there are errors */}
      {error && retryCount > 0 && (
        <div className="mt-2 text-center">
          {retryCount < maxRetries ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchActivity}
              disabled={loading}
            >
              Retry ({retryCount}/{maxRetries})
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setRetryCount(0);
                setRetryDelay(1000);
                setError(null);
                fetchActivity();
              }}
            >
              Reset & Retry
            </Button>
          )}
        </div>
      )}

      {/* Header */}

      {/* Header */}

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

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={events.length === 0}
            >
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={loading && !data} />

      {/* Filters */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter activity..."
        className={loading ? 'opacity-50 pointer-events-none' : ''}
        onClear={handleClearFilters}
        filters={[
          {
            key: 'bot',
            value: selectedBot,
            onChange: setSelectedBot,
            options: botOptions,
            className: "w-full sm:w-1/4"
          },
          {
            key: 'provider',
            value: selectedProvider,
            onChange: setSelectedProvider,
            options: providerOptions,
            className: "w-full sm:w-1/4"
          },
          {
            key: 'llm',
            value: selectedLlmProvider,
            onChange: setSelectedLlmProvider,
            options: llmOptions,
            className: "w-full sm:w-1/4"
          }
        ]}
      >
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-sm w-auto"
            placeholder="Start Date"
          />
          <span className="text-base-content/50">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-sm w-auto"
            placeholder="End Date"
          />
          {(selectedBot !== 'all' || selectedProvider !== 'all' || selectedLlmProvider !== 'all' || startDate || endDate || searchQuery) && (
             <Button
               size="sm"
               variant="ghost"
               className="btn-square"
               onClick={handleClearFilters}
               title="Clear All Filters"
             >
               <X className="w-4 h-4" />
             </Button>
          )}
        </div>
      </SearchFilterBar>

      {/* Content */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={events.length === 0 ? "No activity yet" : "No matching events"}
          description={events.length === 0 ? "Events will appear here as your bots process messages" : "Try adjusting your search or filters"}
          actionLabel="Refresh"
          onAction={fetchActivity}
        />
      ) : (
        <Card>
          {viewMode === 'table' ? (
            <DataTable
              data={filteredEvents}
              columns={columns}
              loading={loading}
              pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={false} // We use SearchFilterBar
              exportable={false} // We have our own export button
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
