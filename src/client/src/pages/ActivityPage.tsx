import { withRetry } from '../utils/withRetry';
import logger from '../utils/logger';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, RefreshCw, X, Info, BarChart3, CheckCircle2, AlertCircle, Bot } from 'lucide-react';
import { Alert } from '../components/DaisyUI/Alert';
import Badge from '../components/DaisyUI/Badge';
import Tooltip from '../components/DaisyUI/Tooltip';
import Button from '../components/DaisyUI/Button';
import Card from '../components/DaisyUI/Card';
import DataTable from '../components/DaisyUI/DataTable';
import type { Column } from '../components/DaisyUI/DataTable';
import StatsCards from '../components/DaisyUI/StatsCards';
import Timeline from '../components/DaisyUI/Timeline';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import EmptyState from '../components/DaisyUI/EmptyState';
import Input from '../components/DaisyUI/Input';
import Join from '../components/DaisyUI/Join';
import SearchFilterBar from '../components/SearchFilterBar';
import { apiService, ActivityEvent, ActivityResponse } from '../services/api';
import useUrlParams from '../hooks/useUrlParams';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '../hooks/useWebSocket';

const ActivityPage: React.FC = () => {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'conversation'>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Live Orchestration State
  const [orchestrationLogs, setOrchestrationLogs] = useState<any[]>([]);
  const { socket, connect } = useWebSocket();

  useEffect(() => {
    connect();
    if (socket) {
      const handleDecision = (decision: any) => {
        setOrchestrationLogs(prev => [
          { ...decision, timestamp: new Date().toISOString() },
          ...prev
        ].slice(0, 50));
      };
      socket.on('pipeline_decision', handleDecision);
      return () => {
        socket.off('pipeline_decision', handleDecision);
      };
    }
  }, [socket, connect]);

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
  const [_maxRetries, setMaxRetries] = useState(3);
  const [_retryDelay, setRetryDelay] = useState(1000); // 1 second initial delay

  // Build activity endpoint URL from filter state
  const activityUrl = useMemo(() => {
    const query = new URLSearchParams();
    if (selectedBot !== 'all') query.append('bot', selectedBot);
    if (selectedProvider !== 'all') query.append('messageProvider', selectedProvider);
    if (selectedLlmProvider !== 'all') query.append('llmProvider', selectedLlmProvider);
    if (startDate) query.append('from', new Date(startDate).toISOString());
    if (endDate) query.append('to', new Date(endDate).toISOString());
    const search = query.toString();
    return `/api/dashboard/activity${search ? `?${search}` : ''}`;
  }, [selectedBot, selectedProvider, selectedLlmProvider, startDate, endDate]);

  // Use cached query with optional polling
  const {
    data: activityResult,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery<ActivityResponse>({
    queryKey: ['activity', activityUrl],
    queryFn: () => apiService.get<ActivityResponse>(activityUrl),
    staleTime: 15_000,
    gcTime: 30_000,
    refetchInterval: autoRefresh ? 5000 : undefined,
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

  // Group events into conversation threads (by channel + user)
  const conversationThreads = useMemo(() => {
    const threads = new Map<string, ActivityEvent[]>();
    filteredEvents.forEach(event => {
      const threadKey = `${event.channelId}-${event.userId}-${event.botName}`;
      if (!threads.has(threadKey)) {
        threads.set(threadKey, []);
      }
      threads.get(threadKey)!.push(event);
    });
    return threads;
  }, [filteredEvents]);

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
    return <Badge variant={variants[status] || 'primary'} size="sm">{status}</Badge>;
  };

  const columns: Column<ActivityEvent>[] = [
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
      render: (value: string) => <Badge variant="neutral" size="sm">{value}</Badge>,
    },
    {
      key: 'llmProvider',
      title: 'LLM',
      sortable: true,
      render: (value: string) => <Badge variant="primary" size="sm" style="outline">{value}</Badge>,
    },
    {
      key: 'processingTime',
      title: 'Duration',
      sortable: true,
      width: '100px',
      render: (value: number) => value ? <span className="font-mono">{value}ms</span> : '-',
    },
    {
      key: 'messageType',
      title: 'Event',
      sortable: true,
      width: '140px',
      render: (value: string) => {
        const typeLabels: Record<string, { label: string; variant: 'primary' | 'secondary' | 'accent' | 'info' | 'warning' | 'error' }> = {
          incoming: { label: '📥 Incoming', variant: 'primary' },
          outgoing: { label: '📤 Outgoing', variant: 'secondary' },
          error: { label: '❌ Error', variant: 'error' },
          timeout: { label: '⏱️ Timeout', variant: 'warning' },
        };
        const info = typeLabels[value] || { label: value, variant: 'info' };
        return <Badge variant={info.variant} size="sm">{info.label}</Badge>;
      },
    },
  ];

  const stats = [
    {
      id: 'total',
      title: 'Total Events',
      value: events.length,
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'success',
      title: 'Successful',
      value: events.filter(e => e.status === 'success').length,
      icon: <CheckCircle2 className="w-8 h-8" />,
      color: 'success' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: events.filter(e => e.status === 'error' || e.status === 'timeout').length,
      icon: <AlertCircle className="w-8 h-8" />,
      color: 'error' as const,
    },
    {
      id: 'bots',
      title: 'Active Bots',
      value: availableFilters?.agents?.length || 0,
      icon: <Bot className="w-8 h-8" />,
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

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={loading && !data} />

      {/* Event Status Legend */}
      <div className="flex items-center gap-4 text-xs text-base-content/60">
        <Tooltip content="What each status means">
          <span className="flex items-center gap-1 cursor-help">
            <Info className="w-3 h-3" /> Status legend
          </span>
        </Tooltip>
        <span className="flex items-center gap-1">
          <Badge variant="success" size="xs">success</Badge> Message processed
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="error" size="xs">error</Badge> Processing failed
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="warning" size="xs">timeout</Badge> Response timed out
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="primary" size="xs">pending</Badge> Awaiting response
        </span>
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
        <div className="flex items-center gap-2 flex-wrap">
          <Join>
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant="ghost"
                className="join-item btn-xs"
                onClick={() => handleQuickTimeRange(range)}
                title={`Last ${range}`}
              >
                {range}
              </Button>
            ))}
          </Join>
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
               aria-label="Clear All Filters"
             >
               <X className="w-4 h-4" />
             </Button>
          )}
        </div>
      </SearchFilterBar>

      {/* Live Orchestration Log (New Feature) */}
      <Card title="Live Orchestration Log" icon={<RefreshCw className={`w-5 h-5 ${orchestrationLogs.length > 0 ? 'animate-spin-slow' : ''}`} />}>
        <div className="max-h-60 overflow-y-auto bg-base-300 rounded-lg p-4 font-mono text-xs space-y-1">
          {orchestrationLogs.length === 0 ? (
            <div className="text-base-content/30 italic">Waiting for orchestration events...</div>
          ) : (
            orchestrationLogs.map((log, i) => (
              <div key={i} className="flex gap-4 border-b border-base-100/10 pb-1">
                <span className="text-base-content/40 w-24 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-secondary w-20 shrink-0 font-bold">[{log.botName}]</span>
                <span className={`w-16 shrink-0 ${log.shouldReply ? 'text-success' : 'text-error'}`}>
                  {log.shouldReply ? 'REPLY' : 'IGNORE'}
                </span>
                <span className="text-base-content/70">{log.reason}</span>
                {log.probabilityRoll !== undefined && (
                  <span className="text-base-content/40 ml-auto">
                    (Roll: {(log.probabilityRoll * 100).toFixed(0)}% / Thr: {(log.threshold * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/60">
          {viewMode === 'conversation'
            ? `Grouped into ${conversationThreads.size} conversation${conversationThreads.size !== 1 ? 's' : ''}`
            : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`}
        </p>
        <Join>
          <Button
            size="sm"
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            className="join-item"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
            className="join-item"
            onClick={() => setViewMode('timeline')}
          >
            Timeline
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'conversation' ? 'primary' : 'ghost'}
            className="join-item"
            onClick={() => setViewMode('conversation')}
          >
            Conversations
          </Button>
        </Join>
      </div>

      {/* Content */}
      {loading && !data ? (
        <SkeletonPage variant="table" statsCount={0} showFilters={false} />
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
              pagination={{ pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={false}
            />
          ) : viewMode === 'conversation' ? (
            <div className="space-y-4 p-4">
              {Array.from(conversationThreads.entries()).map(([threadKey, threadEvents]) => {
                const [channelId, userId, botName] = threadKey.split('-');
                return (
                  <Card key={threadKey} compact>
                    <div className="px-4 py-2 bg-base-200 border-b border-base-300 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="primary" size="xs">{botName}</Badge>
                        <span className="text-base-content/60">User: {userId.slice(0, 8)}…</span>
                        <span className="text-base-content/40">•</span>
                        <span className="text-base-content/60">Channel: {channelId.slice(0, 8)}…</span>
                      </div>
                      <span className="text-xs text-base-content/50">{threadEvents.length} messages</span>
                    </div>
                    <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                      {threadEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                            evt.messageType === 'incoming'
                              ? 'bg-base-200'
                              : evt.status === 'error' || evt.status === 'timeout'
                              ? 'bg-error/10 border border-error/20'
                              : 'bg-success/10'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            evt.messageType === 'incoming' ? 'bg-primary' :
                            evt.status === 'error' || evt.status === 'timeout' ? 'bg-error' : 'bg-success'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {evt.messageType === 'incoming' ? 'User' : evt.botName}
                              </span>
                              <span className="text-xs text-base-content/40">
                                {new Date(evt.timestamp).toLocaleTimeString()}
                              </span>
                              {evt.processingTime && (
                                <span className="text-xs text-base-content/40">
                                  ({evt.processingTime}ms)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-base-content/60 mt-0.5">
                              {evt.status === 'error' ? `Error: ${evt.errorMessage || 'Unknown'}` :
                               evt.messageType} via {evt.provider} → {evt.llmProvider}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
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
