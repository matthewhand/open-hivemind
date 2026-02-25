/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('all');

  // Cache initial filters to populate dropdowns even when filtered
  const [availableFilters, setAvailableFilters] = useState<ActivityResponse['filters'] | null>(null);
  const filtersInitialized = useRef(false);

  const fetchActivity = useCallback(async () => {
    try {
      // Don't set loading on auto-refresh to avoid flickering
      if (!autoRefresh) setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedBot !== 'all') params.bot = selectedBot;
      if (selectedProvider !== 'all') params.messageProvider = selectedProvider;
      if (selectedLlmProvider !== 'all') params.llmProvider = selectedLlmProvider;

      const result = await apiService.getActivity(params);
      setData(result);

      // Store initial filters
      if (!filtersInitialized.current && result.filters) {
        setAvailableFilters(result.filters);
        filtersInitialized.current = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity';
      setError(message);
      console.error('Error fetching activity:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBot, selectedProvider, selectedLlmProvider, autoRefresh]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]); // fetchActivity depends on filters, so this runs when filters change

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

  const timelineEvents = useMemo(() => filteredEvents.map(event => ({
    id: event.id || `${event.timestamp}-${event.botName}`,
    timestamp: new Date(event.timestamp),
    title: `${event.botName}: ${event.status}`,
    description: `Provider: ${event.provider} | LLM: ${event.llmProvider}`,
    type: event.status === 'error' || event.status === 'timeout' ? 'error' as const :
      event.status === 'success' ? 'success' as const : 'info' as const,
    metadata: { ...event },
  })), [filteredEvents]);

  const getStatusBadge = useCallback((status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'primary'> = {
      success: 'success',
      error: 'error',
      timeout: 'warning',
      pending: 'primary',
    };
    return <Badge variant={variants[status] || 'primary'} size="small">{status}</Badge>;
  }, []);

  const columns = useMemo(() => [
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
  ], [getStatusBadge]);

  const stats = useMemo(() => [
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
  ], [events, availableFilters?.agents?.length]);

  // Construct filter options
  const botOptions = useMemo(() => [
    { value: 'all', label: 'All Bots' },
    ...(availableFilters?.agents || []).map(agent => ({ value: agent, label: agent }))
  ], [availableFilters?.agents]);

  const providerOptions = useMemo(() => [
    { value: 'all', label: 'All Providers' },
    ...(availableFilters?.messageProviders || []).map(p => ({ value: p, label: p }))
  ], [availableFilters?.messageProviders]);

  const llmOptions = useMemo(() => [
    { value: 'all', label: 'All LLMs' },
    ...(availableFilters?.llmProviders || []).map(p => ({ value: p, label: p }))
  ], [availableFilters?.llmProviders]);

  const filterConfigs = useMemo(() => [
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
  ], [selectedBot, botOptions, selectedProvider, providerOptions, selectedLlmProvider, llmOptions]);

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
        filters={filterConfigs}
      />

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
