/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import { Clock, RefreshCw, Info, BarChart3, CheckCircle2, AlertCircle, Bot, LayoutList, GitBranch, Download, Play } from 'lucide-react';
import { Alert } from '../../components/DaisyUI/Alert';
import Badge from '../../components/DaisyUI/Badge';
import Tooltip from '../../components/DaisyUI/Tooltip';
import Button from '../../components/DaisyUI/Button';
import StatsCards from '../../components/DaisyUI/StatsCards';
import Join from '../../components/DaisyUI/Join';
import Toggle from '../../components/DaisyUI/Toggle';
import PageHeader from '../../components/DaisyUI/PageHeader';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
import type { ActivityEvent } from '../../services/api';
import { ActivityEventList } from './ActivityEventList';
import { ActivityFilters } from './ActivityFilters';
import { ActivityOrchestrationLog } from './ActivityOrchestrationLog';
import { PipelineStepTimeline } from './PipelineStepTimeline';
import { useActivityData } from './hooks/useActivityData';
import { useActivityDerived } from './hooks/useActivityDerived';
import { useActivityFilters } from './hooks/useActivityFilters';
import { reconstructPipelineSteps } from './pipelineSteps';

const ActivityPage: React.FC = () => {
  const filters = useActivityFilters();
  const {
    viewMode,
    setViewMode,
    autoRefresh,
    setAutoRefresh,
    eventTypes,
    toggleEventType,
    replayEvent,
    setReplayEvent,
    searchQuery,
    setSearchQuery,
    selectedBot,
    setSelectedBot,
    selectedProvider,
    setSelectedProvider,
    selectedLlmProvider,
    setSelectedLlmProvider,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleClearFilters: clearFilterValues,
    handleQuickTimeRange,
  } = filters;

  const {
    data,
    loading,
    error,
    setError,
    availableFilters,
    retryCount,
    setRetryCount,
    _maxRetries,
    _retryDelay,
    setRetryDelay,
    allEvents,
    orchestrationLogs,
    activeBotCount,
    fetchActivity,
    handleLoadMore,
    setOffset,
  } = useActivityData({
    selectedBot,
    selectedProvider,
    selectedLlmProvider,
    startDate,
    endDate,
    autoRefresh,
  });

  const handleClearFilters = () => {
    clearFilterValues();
    setOffset(0);
  };

  const {
    events,
    safeFilteredEvents,
    conversationThreads,
    timelineEvents,
  } = useActivityDerived(allEvents, searchQuery, eventTypes);

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
      value: activeBotCount ?? (availableFilters?.agents?.length || 0),
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
          {retryCount < _maxRetries ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchActivity}
              disabled={loading} aria-busy={loading}
            >
              Retry ({retryCount}/{_maxRetries})
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
            <Join>
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
            </Join>

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
              disabled={loading} aria-busy={loading}
              aria-label="Refresh activity"
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

      <ActivityFilters
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedBot={selectedBot}
        setSelectedBot={setSelectedBot}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        selectedLlmProvider={selectedLlmProvider}
        setSelectedLlmProvider={setSelectedLlmProvider}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleClearFilters={handleClearFilters}
        handleQuickTimeRange={handleQuickTimeRange}
        botOptions={botOptions}
        providerOptions={providerOptions}
        llmOptions={llmOptions}
        eventTypes={eventTypes}
        toggleEventType={toggleEventType}
      />

      {/* Live Orchestration Log (New Feature) */}
      <ActivityOrchestrationLog orchestrationLogs={orchestrationLogs} />

      <ActivityEventList
        loading={loading}
        data={data}
        events={events}
        safeFilteredEvents={safeFilteredEvents}
        conversationThreads={conversationThreads}
        timelineEvents={timelineEvents}
        viewMode={viewMode}
        setViewMode={setViewMode}
        setReplayEvent={setReplayEvent}
        fetchActivity={fetchActivity}
      />

      {/* Message Flow Replay Drawer */}
      <DetailDrawer
        isOpen={replayEvent !== null}
        onClose={() => setReplayEvent(null)}
        title={
          replayEvent ? (
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Message Flow Replay
            </span>
          ) : undefined
        }
        subtitle={
          replayEvent
            ? `${replayEvent.botName} · ${new Date(replayEvent.timestamp).toLocaleString()} · ${replayEvent.status}`
            : undefined
        }
        widthClass="md:max-w-[520px]"
      >
        {replayEvent && (
          <PipelineStepTimeline steps={reconstructPipelineSteps(replayEvent)} />
        )}
      </DetailDrawer>

      {/* Pagination Load More */}
      {data?.pagination?.hasMore && (
        <div className="flex justify-center mt-8 pb-8">
          <Button
            onClick={handleLoadMore}
            loading={loading}
            buttonStyle="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Load More Activity
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityPage;
