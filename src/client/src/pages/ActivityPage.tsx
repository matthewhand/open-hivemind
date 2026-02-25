/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { apiService, ActivityResponse, ActivityEvent } from '../services/api';

const ActivityPage: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<string>('all');

  // Cache initial filters for dropdowns
  const [availableFilters, setAvailableFilters] = useState<{
    agents: string[];
    messageProviders: string[];
    llmProviders: string[];
  } | null>(null);

  const fetchActivity = useCallback(async (isAutoRefresh = false) => {
    try {
      setError(null);
      // Only set loading on initial fetch or manual refresh, not auto-refresh to avoid flickering
      if (!isAutoRefresh) setLoading(true);

      const response = await apiService.getActivity({
        bot: selectedBot !== 'all' ? selectedBot : undefined,
        messageProvider: selectedProvider !== 'all' ? selectedProvider : undefined,
        llmProvider: selectedLlmProvider !== 'all' ? selectedLlmProvider : undefined
      });

      setData(response);

      // Initialize available filters once
      setAvailableFilters(prev => {
        if (!prev && response.filters) return response.filters;
        return prev;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activity';
      setError(message);
      console.error('Error fetching activity:', err);
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  }, [selectedBot, selectedProvider, selectedLlmProvider]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchActivity(true), 5000);
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

  // Client-side search filtering
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const lowerQuery = searchQuery.toLowerCase();
    return events.filter(e =>
      e.botName.toLowerCase().includes(lowerQuery) ||
      e.provider.toLowerCase().includes(lowerQuery) ||
      e.llmProvider.toLowerCase().includes(lowerQuery) ||
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
    return <Badge variant={variants[status] || 'primary' as any} size="sm">{status}</Badge>;
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
      value: filteredEvents.length,
      icon: '📊',
      color: 'primary' as const,
    },
    {
      id: 'success',
      title: 'Successful',
      value: filteredEvents.filter(e => e.status === 'success').length,
      icon: '✅',
      color: 'success' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: filteredEvents.filter(e => e.status === 'error' || e.status === 'timeout').length,
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

  // Helper to create options for Select
  const createOptions = (items: string[] = [], defaultLabel: string) => [
    { value: 'all', label: defaultLabel },
    ...items.map(item => ({ value: item, label: item }))
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
              onClick={() => fetchActivity()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button variant="ghost" size="sm" onClick={handleExport} disabled={!data?.events.length}>
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
        searchPlaceholder="Search events..."
        filters={[
          {
            key: 'bot',
            value: selectedBot,
            onChange: setSelectedBot,
            options: createOptions(availableFilters?.agents, 'All Bots'),
            className: "w-full sm:w-40"
          },
          {
            key: 'provider',
            value: selectedProvider,
            onChange: setSelectedProvider,
            options: createOptions(availableFilters?.messageProviders, 'All Providers'),
            className: "w-full sm:w-40"
          },
          {
            key: 'llm',
            value: selectedLlmProvider,
            onChange: setSelectedLlmProvider,
            options: createOptions(availableFilters?.llmProviders, 'All LLMs'),
            className: "w-full sm:w-40"
          }
        ]}
        onClear={() => {
            setSelectedBot('all');
            setSelectedProvider('all');
            setSelectedLlmProvider('all');
        }}
      />

      {/* Content */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No activity found"
          description={data?.events.length === 0 ? "Events will appear here as your bots process messages" : "Try adjusting your filters"}
          actionLabel={data?.events.length !== 0 ? "Clear Filters" : undefined}
          onAction={data?.events.length !== 0 ? () => {
             setSearchQuery('');
             setSelectedBot('all');
             setSelectedProvider('all');
             setSelectedLlmProvider('all');
          } : undefined}
        />
      ) : (
        <Card>
          {viewMode === 'table' ? (
            <DataTable
              data={filteredEvents}
              columns={columns}
              loading={loading}
              pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={false} // We handle search externally
              exportable={false} // We handle export externally
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
