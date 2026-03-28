/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Webhook,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Filter,
  Clock,
  MessageSquare,
  Hash,
} from 'lucide-react';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import Card from '../components/DaisyUI/Card';
import PageHeader from '../components/DaisyUI/PageHeader';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import EmptyState from '../components/DaisyUI/EmptyState';
import Toggle from '../components/DaisyUI/Toggle';
import { Alert } from '../components/DaisyUI/Alert';

// ── Types ───────────────────────────────────────────────────────────────────

interface WebhookEventSummary {
  id: string;
  timestamp: string;
  source: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  payloadPreview: string;
  error?: string;
}

interface EventsResponse {
  success: boolean;
  data: {
    items: WebhookEventSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  discord: <MessageSquare className="w-4 h-4 text-indigo-400" />,
  slack: <Hash className="w-4 h-4 text-green-400" />,
  mattermost: <MessageSquare className="w-4 h-4 text-blue-400" />,
  telegram: <MessageSquare className="w-4 h-4 text-sky-400" />,
};

function sourceIcon(source: string) {
  return SOURCE_ICONS[source.toLowerCase()] ?? <Webhook className="w-4 h-4 text-base-content/60" />;
}

function statusBadge(code: number) {
  if (code >= 200 && code < 300) return <Badge variant="success">{code}</Badge>;
  if (code >= 300 && code < 400) return <Badge variant="warning">{code}</Badge>;
  return <Badge variant="error">{code}</Badge>;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Component ───────────────────────────────────────────────────────────────

const WebhookEventsPage: React.FC = () => {
  const [events, setEvents] = useState<WebhookEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expand / detail
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Retry state
  const [retrying, setRetrying] = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (sourceFilter) params.set('source', sourceFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());

      const resp = await fetch(`/api/webhooks/events?${params.toString()}`, {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: EventsResponse = await resp.json();
      if (json.success) {
        setEvents(json.data.items);
        setTotalPages(json.data.totalPages);
        setTotal(json.data.total);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load webhook events');
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchEvents(true), 5000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchEvents]);

  // ── Expand / detail ─────────────────────────────────────────────────────

  const toggleExpand = useCallback(async (eventId: string) => {
    if (expandedId === eventId) {
      setExpandedId(null);
      setDetailPayload(null);
      return;
    }
    setExpandedId(eventId);
    setDetailLoading(true);
    try {
      const resp = await fetch(`/api/webhooks/events/${eventId}`, { credentials: 'include' });
      const json = await resp.json();
      if (json.success) {
        setDetailPayload(json.data.payload);
      }
    } catch {
      setDetailPayload('Error loading payload');
    } finally {
      setDetailLoading(false);
    }
  }, [expandedId]);

  // ── Retry ───────────────────────────────────────────────────────────────

  const handleRetry = useCallback(async (eventId: string) => {
    setRetrying(eventId);
    try {
      const resp = await fetch(`/api/webhooks/events/${eventId}/retry`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error);
      // Refresh the list
      fetchEvents(true);
    } catch (err: any) {
      setError(err.message ?? 'Retry failed');
    } finally {
      setRetrying(null);
    }
  }, [fetchEvents]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading && events.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Webhook Events" subtitle="Inspect incoming webhook traffic" />
        <SkeletonPage variant="table" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Webhook Events"
        subtitle={`${total} events logged`}
        actions={
          <div className="flex items-center gap-3">
            <Toggle
              label="Auto-refresh"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(v => !v)}
            />
            <Button size="sm" variant="ghost" onClick={() => fetchEvents()}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert type="error" title="Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4 p-4">
          <div className="form-control">
            <label className="label" htmlFor="wh-source-filter">
              <span className="label-text">Source</span>
            </label>
            <select
              id="wh-source-filter"
              className="select select-bordered select-sm"
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Sources</option>
              <option value="discord">Discord</option>
              <option value="slack">Slack</option>
              <option value="mattermost">Mattermost</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label" htmlFor="wh-status-filter">
              <span className="label-text">Status</span>
            </label>
            <select
              id="wh-status-filter"
              className="select select-bordered select-sm"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label" htmlFor="wh-start-date">
              <span className="label-text">From</span>
            </label>
            <input
              id="wh-start-date"
              type="datetime-local"
              className="input input-bordered input-sm"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
            />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="wh-end-date">
              <span className="label-text">To</span>
            </label>
            <input
              id="wh-end-date"
              type="datetime-local"
              className="input input-bordered input-sm"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSourceFilter('');
              setStatusFilter('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
          >
            <Filter className="w-4 h-4" /> Clear
          </Button>
        </div>
      </Card>

      {/* Event Table */}
      {events.length === 0 ? (
        <EmptyState
          icon={<Webhook className="w-12 h-12" />}
          title="No webhook events"
          description="No webhook events match the current filters."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th className="w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <React.Fragment key={ev.id}>
                    <tr
                      className="cursor-pointer hover:bg-base-200/50"
                      onClick={() => toggleExpand(ev.id)}
                    >
                      <td>
                        {expandedId === ev.id
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="whitespace-nowrap text-xs font-mono">
                        <Clock className="w-3 h-3 inline mr-1 opacity-50" />
                        {formatTimestamp(ev.timestamp)}
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5">
                          {sourceIcon(ev.source)}
                          <span className="capitalize">{ev.source}</span>
                        </span>
                      </td>
                      <td className="font-mono text-xs truncate max-w-[240px]" title={ev.endpoint}>
                        <span className="badge badge-ghost badge-xs mr-1">{ev.method}</span>
                        {ev.endpoint}
                      </td>
                      <td>{statusBadge(ev.statusCode)}</td>
                      <td className="text-xs">{formatDuration(ev.duration)}</td>
                      <td>
                        {ev.statusCode >= 400 && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={e => { e.stopPropagation(); handleRetry(ev.id); }}
                            disabled={retrying === ev.id}
                          >
                            <RotateCcw className={`w-3 h-3 ${retrying === ev.id ? 'animate-spin' : ''}`} />
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expandedId === ev.id && (
                      <tr>
                        <td colSpan={7} className="bg-base-200/30 p-4">
                          {ev.error && (
                            <div className="mb-3">
                              <Badge variant="error">Error</Badge>
                              <span className="ml-2 text-sm text-error">{ev.error}</span>
                            </div>
                          )}
                          <div className="text-xs font-mono mb-1 text-base-content/60">
                            Payload Preview:
                          </div>
                          {detailLoading ? (
                            <div className="skeleton h-24 w-full" />
                          ) : (
                            <pre className="bg-base-300 rounded-lg p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                              {detailPayload != null
                                ? JSON.stringify(detailPayload, null, 2)
                                : ev.payloadPreview || '(empty payload)'}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-base-200">
              <span className="text-sm text-base-content/60">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="join">
                <Button
                  size="sm"
                  className="join-item"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  className="join-item"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default WebhookEventsPage;
