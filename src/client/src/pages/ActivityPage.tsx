import { withRetry } from '../utils/withRetry';
import logger from '../utils/logger';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Download, LayoutList, GitBranch, RefreshCw, X, Info, Calendar } from 'lucide-react';
import { Alert } from '../components/DaisyUI/Alert';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import Card from '../components/DaisyUI/Card';
import DataTable from '../components/DaisyUI/DataTable';
import type { RDVColumn } from '../components/DaisyUI/DataTable';
import StatsCards from '../components/DaisyUI/StatsCards';
import Timeline from '../components/DaisyUI/Timeline';
import Toggle from '../components/DaisyUI/Toggle';
import PageHeader from '../components/DaisyUI/PageHeader';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import EmptyState from '../components/DaisyUI/EmptyState';
import Input from '../components/DaisyUI/Input';
import SearchFilterBar from '../components/SearchFilterBar';
import Tooltip from '../components/DaisyUI/Tooltip';
import { apiService, ActivityEvent, ActivityResponse } from '../services/api';
import useUrlParams from '../hooks/useUrlParams';
import { useApiQuery } from '../hooks/useApiQuery';

const ActivityPage: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter State (URL-persisted)
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    bot: { type: 'string', default: 'all' },
    provider: { type: 'string', default: 'all' },
    llm: { type: 'string', default: 'all' },
    from: { type: 'string', default: '' },
    to: { type: 'string', default: '' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const selectedBot = urlParams.bot;
  const setSelectedBot = (v: string) => setUrlParam('bot', v);
  const selectedProvider = urlParams.provider;
  const setSelectedProvider = (v: string) => setUrlParam('provider', v);
  const selectedLlmProvider = urlParams.llm;
  const setSelectedLlmProvider = (v: string) => setUrlParam('llm', v);
  const startDate = urlParams.from;
  const setStartDate = (v: string) => setUrlParam('from', v);
  const endDate = urlParams.to;
  const setEndDate = (v: string) => setUrlParam('to', v);

  // Cache initial filters to populate dropdowns even when filtered
  const [availableFilters, setAvailableFilters] = useState<ActivityResponse['filters'] | null>(null);

  // Enhanced error handling with retry logic
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryDelay, setRetryDelay] = useState(1000); // 1 second initial delay

  // Build activity endpoint URL from filter state
  const activityUrl = useMemo(() => {
    const query = new URLSearchParams();
    if (selectedBot !== 'all') query.append('bot', selectedBot);
    if (selectedProvider !== 'all') query.append('messageProvider', selectedProvider);
    if (selectedLlmProvider !== 'all') query.append('llmProvider', selectedLlmProvider);
    if (startDate) query.append('from', new Date(startDate).toISOString());
    if (endDate) query.append('to', new Date(endDate).toISOString());
    const search = query.toString();
    return `/api/dashboard/api/activity${search ? `?${search}` : ''}`;
  }, [selectedBot, selectedProvider, selectedLlmProvider, startDate, endDate]);

  // Use cached query with optional polling
  const {
    data: activityResult,
    loading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useApiQuery<ActivityResponse>(activityUrl, {
    ttl: 15_000,
    pollInterval: autoRefresh ? 5000 : undefined,
  });

  // Sync into local state
  useEffect(() => {
    if (activityResult) {
      setData(activityResult);
      if (activityResult.filters) {
        setAvailableFilters(prev => prev || activityResult.filters);
      }
      setRetryCount(0);
      setRetryDelay(1000);
    }
  }, [activityResult]);

  useEffect(() => {
    if (!autoRefresh) setLoading(activityLoading);
  }, [activityLoading, autoRefresh]);

  useEffect(() => {
    if (activityError) {
      setError(activityError.message);
    } else {
      setError(null);
    }
  }, [activityError]);

  const fetchActivity = useCallback(async () => {
    await refetchActivity();
  }, [refetchActivity]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedBot('all');
    setSelectedProvider('all');
    setSelectedLlmProvider('all');
    setStartDate('');
    setEndDate('');
  };

  // Quick time range presets (salvaged from dead Admin/ActivityMonitor)
  const handleQuickTimeRange = (range: '1h' | '6h' | '24h' | '7d' | '30d') => {
    const now = new Date();
    const toDate = now.toISOString().split('T')[0];
    let fromDate: Date;

    switch (range) {
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    setStartDate(fromDate.toISOString().split('T')[0]);
    setEndDate(toDate);
  };

  // Keyboard shortcuts for date range selection
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if Alt+Shift is pressed (to avoid conflicts)
      if (event.altKey && event.shiftKey) {
        switch(event.key) {
          case 'H':
            handleQuickTimeRange('1h');
            event.preventDefault();
            break;
          case 'D':
            handleQuickTimeRange('24h');
            event.preventDefault();
            break;
          case 'W':
            handleQuickTimeRange('7d');
            event.preventDefault();
            break;
          case 'M':
            handleQuickTimeRange('30d');
            event.preventDefault();
            break;
          case 'C':
            handleClearFilters();
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchActivity]);

  const handleExport = async () => {
    if (!data?.events || data.events.length === 0) return;

    setIsExporting(true);
    try {
      // Simulate export processing time
      await new Promise(resolve => setTimeout(resolve, 500));

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
    } finally {
      setIsExporting(false);
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

  const columns: RDVColumn<ActivityEvent>[] = [
    {
      key: 'timestamp',
      title: 'Time',
      sortable: true,
      width: '180px',
      render: (value: string) => <span className="font-mono text-sm">{new Date(value).toLocaleString()}</span>,
    },
    {
      key: 'botName',
      title: 'Bot',
      sortable: true,
      prominent: true,
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      prominent: true,
      width: '100px',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'provider',
      title: 'Provider',
      sortable: true,
      render: (value: string) => <Badge variant="neutral" size="small">{value}</Badge>,
    },
    {
      key: 'llmProvider',
      title: 'LLM',
      sortable: true,
      render: (value: string) => <Badge variant="primary" size="small" style="outline">{value}</Badge>,
    },
    {
      key: 'processingTime',
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
      description: 'All activity events captured in the selected time period',
    },
    {
      id: 'success',
      title: 'Successful',
      value: events.filter(e => e.status === 'success').length,
      icon: '✅',
      color: 'success' as const,
      description: 'Messages processed successfully without errors',
    },
    {
      id: 'errors',
      title: 'Errors',
      value: events.filter(e => e.status === 'error' || e.status === 'timeout').length,
      icon: '❌',
      color: 'error' as const,
      description: 'Failed messages including timeouts and processing errors',
    },
    {
      id: 'bots',
      title: 'Active Bots',
      value: availableFilters?.agents?.length || 0,
      icon: '🤖',
      color: 'secondary' as const,
      description: 'Number of bots that have processed messages',
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
              disabled={loading} aria-busy={loading}
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
      <PageHeader
        title="Activity Feed"
        description="Real-time message flow and events"
        icon={Clock}
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="join">
              <Tooltip content="View as data table" position="bottom">
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'primary' : 'ghost'}
                  className="join-item"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                >
                  <LayoutList className="w-4 h-4" /> Table
                </Button>
              </Tooltip>
              <Tooltip content="View as timeline" position="bottom">
                <Button
                  size="sm"
                  variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
                  className="join-item"
                  onClick={() => setViewMode('timeline')}
                  aria-label="Timeline view"
                >
                  <GitBranch className="w-4 h-4" /> Timeline
                </Button>
              </Tooltip>
            </div>

            {/* Auto Refresh Toggle */}
            <Tooltip content="Automatically refresh data every 5 seconds" position="bottom">
              <div>
                <Toggle
                  label="Auto"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="sm"
                  aria-label="Auto refresh toggle"
                />
              </div>
            </Tooltip>

            <Tooltip content="Refresh activity data" position="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchActivity}
                disabled={loading}
                aria-busy={loading}
                aria-label="Refresh activity data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </Tooltip>

            <Tooltip content="Export activity data to CSV" position="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={events.length === 0 || isExporting}
                aria-label="Export to CSV"
              >
                {isExporting ? (
                  <span className="loading loading-spinner loading-sm" aria-hidden="true"></span>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? ' Exporting...' : ' Export'}
              </Button>
            </Tooltip>
          </div>
        }
      />

      {/* Stats Cards with Tooltips */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Tooltip key={stat.id} content={stat.description} position="top">
            <div
              className={`
                card border border-base-300/50 backdrop-blur-sm
                hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30
                transition-all duration-300 cursor-help
                hover:-translate-y-1
                ${stat.color === 'primary' && 'bg-gradient-to-br from-primary/20 via-primary/10 to-transparent'}
                ${stat.color === 'success' && 'bg-gradient-to-br from-success/20 via-success/10 to-transparent'}
                ${stat.color === 'error' && 'bg-gradient-to-br from-error/20 via-error/10 to-transparent'}
                ${stat.color === 'secondary' && 'bg-gradient-to-br from-secondary/20 via-secondary/10 to-transparent'}
              `}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium text-base-content/60 uppercase tracking-wide flex items-center gap-1">
                      {stat.title}
                      <Info className="w-3 h-3 text-base-content/40" aria-hidden="true" />
                    </p>
                    <p className={`text-3xl font-bold text-${stat.color}`}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}/20 text-${stat.color}`}>
                    <span className="text-2xl" aria-hidden="true">{stat.icon}</span>
                  </div>
                </div>
              </div>
            </div>
          </Tooltip>
        ))}
      </div>

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
            className: "w-full sm:w-1/4",
            ariaLabel: "Filter by bot"
          },
          {
            key: 'provider',
            value: selectedProvider,
            onChange: setSelectedProvider,
            options: providerOptions,
            className: "w-full sm:w-1/4",
            ariaLabel: "Filter by message provider"
          },
          {
            key: 'llm',
            value: selectedLlmProvider,
            onChange: setSelectedLlmProvider,
            options: llmOptions,
            className: "w-full sm:w-1/4",
            ariaLabel: "Filter by LLM provider"
          }
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip content="Quick date range shortcuts (Alt+Shift+H/D/W/M)" position="bottom">
            <div className="join">
              {(['1h', '6h', '24h', '7d', '30d'] as const).map((range) => (
                <Button
                  key={range}
                  size="sm"
                  variant="ghost"
                  className="join-item btn-xs"
                  onClick={() => handleQuickTimeRange(range)}
                  title={`Last ${range}`}
                  aria-label={`Filter to last ${range}`}
                >
                  {range}
                </Button>
              ))}
            </div>
          </Tooltip>
          <Tooltip content="Start date for activity filter" position="bottom">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-sm w-auto"
              placeholder="Start Date"
              aria-label="Start date"
              prefix={<Calendar className="w-3 h-3" aria-hidden="true" />}
            />
          </Tooltip>
          <span className="text-base-content/50">-</span>
          <Tooltip content="End date for activity filter" position="bottom">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-sm w-auto"
              placeholder="End Date"
              aria-label="End date"
              prefix={<Calendar className="w-3 h-3" aria-hidden="true" />}
            />
          </Tooltip>
          {(selectedBot !== 'all' || selectedProvider !== 'all' || selectedLlmProvider !== 'all' || startDate || endDate || searchQuery) && (
             <Tooltip content="Clear all filters (Alt+Shift+C)" position="bottom">
               <Button
                 size="sm"
                 variant="ghost"
                 className="btn-square"
                 onClick={handleClearFilters}
                 title="Clear All Filters"
                 aria-label="Clear All Filters"
               >
                 <X className="w-4 h-4" />
               </Button>
             </Tooltip>
          )}
        </div>
      </SearchFilterBar>

      {/* Keyboard shortcuts help */}
      <div className="alert alert-info text-sm">
        <Info className="w-4 h-4" aria-hidden="true" />
        <span>
          <strong>Keyboard shortcuts:</strong> Alt+Shift+H (1 hour), D (24 hours), W (7 days), M (30 days), C (clear filters)
        </span>
      </div>

      {/* Content */}
      {loading && !data ? (
        <SkeletonPage variant="table" statsCount={0} showFilters={false} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={events.length === 0 ? "No activity yet" : "No matching events"}
          description={
            events.length === 0
              ? "Your activity feed is empty. Events will appear here as your bots process messages. Make sure your bots are configured and running to see activity."
              : "No events match your current filters. Try adjusting your search criteria or date range to see more results."
          }
          actionLabel={events.length === 0 ? "Refresh" : "Clear Filters"}
          onAction={events.length === 0 ? fetchActivity : handleClearFilters}
        />
      ) : (
        <Card>
          {viewMode === 'table' ? (
            <DataTable
              data={filteredEvents}
              columns={columns}
              loading={loading}
              pagination={{ pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={false}
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
