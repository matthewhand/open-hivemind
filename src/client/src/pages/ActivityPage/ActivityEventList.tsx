/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Clock, Play } from 'lucide-react';
import Badge from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import Card from '../../components/DaisyUI/Card';
import DataTable from '../../components/DaisyUI/DataTable';
import type { Column } from '../../components/DaisyUI/DataTable';
import EmptyState from '../../components/DaisyUI/EmptyState';
import Join from '../../components/DaisyUI/Join';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import Timeline from '../../components/DaisyUI/Timeline';
import Tooltip from '../../components/DaisyUI/Tooltip';
import type { ActivityEvent } from '../../services/api';
import type { ActivityViewMode } from './hooks/useActivityFilters';

interface ConversationThread {
  channelLabel: string;
  events: ActivityEvent[];
  botNames: string[];
  lastActivity: number;
}

interface ActivityEventListProps {
  loading: boolean;
  data: any;
  events: ActivityEvent[];
  safeFilteredEvents: ActivityEvent[];
  conversationThreads: ConversationThread[];
  timelineEvents: any[];
  viewMode: ActivityViewMode;
  setViewMode: (mode: ActivityViewMode) => void;
  setReplayEvent: (event: ActivityEvent) => void;
  fetchActivity: () => void;
}

export const ActivityEventList: React.FC<ActivityEventListProps> = ({
  loading,
  data,
  events,
  safeFilteredEvents,
  conversationThreads,
  timelineEvents,
  viewMode,
  setViewMode,
  setReplayEvent,
  fetchActivity,
}) => {
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
      key: 'replay' as keyof ActivityEvent,
      title: '',
      width: '60px',
      render: (_: unknown, record: ActivityEvent) => (
        <Tooltip content="Replay message through pipeline">
          <Button
            size="xs"
            variant="ghost"
            className="btn-square"
            onClick={() => setReplayEvent(record)}
            aria-label={`Replay ${record.botName} message`}
          >
            <Play className="w-3.5 h-3.5" />
          </Button>
        </Tooltip>
      ),
    },
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
      render: (value: number) =>
        value ? (
          <span className="font-mono">
            {Number.isFinite(value) ? `${Math.round(value)}ms` : '-'}
          </span>
        ) : (
          '-'
        ),

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

  return (
    <>
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/60">
          {viewMode === 'conversation'
            ? `Grouped into ${conversationThreads.length} conversation${conversationThreads.length !== 1 ? 's' : ''}`
            : `${safeFilteredEvents.length} event${safeFilteredEvents.length !== 1 ? 's' : ''}`}
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
      ) : safeFilteredEvents.length === 0 ? (
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
              data={safeFilteredEvents}
              columns={columns}
              loading={loading}
              pagination={{ pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }}
              searchable={false}
            />
          ) : viewMode === 'conversation' ? (
            <div className="space-y-4 p-4">
              {conversationThreads.map((thread) => (
                <Card key={thread.channelLabel} compact>
                  <div className="px-4 py-2 bg-base-200 border-b border-base-300 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="font-medium text-base-content/80">{thread.channelLabel}</span>
                      {thread.botNames.length > 0 && (
                        <>
                          <span className="text-base-content/40">•</span>
                          {thread.botNames.map((name) => (
                            <Badge key={name} variant="primary" size="xs">{name}</Badge>
                          ))}
                        </>
                      )}
                    </div>
                    <span className="text-xs text-base-content/50">{thread.events.length} messages</span>
                  </div>
                  <div className="p-4 space-y-2 max-h-[40rem] overflow-y-auto">
                    {thread.events.map((evt) => (
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
                              {evt.messageType === 'incoming' ? (evt.userName || 'User') : evt.botName}
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
                          {evt.content && (
                            <p className="text-sm text-base-content/90 mt-1">{evt.content}</p>
                          )}
                          <p className="text-xs text-base-content/60 mt-0.5">
                            {evt.status === 'error' ? `Error: ${evt.errorMessage || 'Unknown'}` :
                             evt.messageType} via {evt.provider}
                            {/* Only bot replies went through an LLM. */}
                            {evt.messageType === 'outgoing' && <> → {evt.llmProvider}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
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

    </>
  );
};
