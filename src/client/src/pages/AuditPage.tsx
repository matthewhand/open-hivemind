/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield,
  Download,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  RefreshCw,
} from 'lucide-react';
import Badge from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import Card from '../components/DaisyUI/Card';
import Input from '../components/DaisyUI/Input';
import Select from '../components/DaisyUI/Select';
import PageHeader from '../components/DaisyUI/PageHeader';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import EmptyState from '../components/DaisyUI/EmptyState';
import { Alert } from '../components/DaisyUI/Alert';
import useUrlParams from '../hooks/useUrlParams';
import { useApiQuery } from '../hooks/useApiQuery';
import Diff from '../components/DaisyUI/Diff';
import Debug from 'debug';
const debug = Debug('app:client:pages:AuditPage');

/** Shape returned by GET /api/audit */
interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

interface AuditResponse {
  success: boolean;
  auditEvents: AuditEvent[];
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Config Create', value: 'CONFIG_CREATE' },
  { label: 'Config Update', value: 'CONFIG_UPDATE' },
  { label: 'Config Delete', value: 'CONFIG_DELETE' },
  { label: 'Config Reload', value: 'CONFIG_RELOAD' },
  { label: 'Bot Create', value: 'BOT_CREATE' },
  { label: 'Bot Update', value: 'BOT_UPDATE' },
  { label: 'Bot Delete', value: 'BOT_DELETE' },
  { label: 'Bot Start', value: 'BOT_START' },
  { label: 'Bot Stop', value: 'BOT_STOP' },
  { label: 'Bot Clone', value: 'BOT_CLONE' },
];

const RESOURCE_OPTIONS = [
  { label: 'All Resources', value: '' },
  { label: 'Bots', value: 'bots' },
  { label: 'Config', value: 'config' },
  { label: 'Providers', value: 'providers' },
  { label: 'System', value: 'system' },
];

const RESULT_BADGE: Record<string, 'success' | 'error'> = {
  success: 'success',
  failure: 'error',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function renderJson(value: any): string {
  if (value === undefined || value === null) return '-';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ExpandedRow: React.FC<{ event: AuditEvent }> = ({ event }) => {
  const showDiff =
    event.oldValue !== undefined &&
    event.newValue !== undefined;

  return (
    <tr>
      <td colSpan={6} className="bg-base-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {event.ipAddress && (
            <div>
              <span className="font-semibold">IP Address:</span> {event.ipAddress}
            </div>
          )}
          {event.userAgent && (
            <div>
              <span className="font-semibold">User Agent:</span> {event.userAgent}
            </div>
          )}
          <div className="col-span-full">
            <span className="font-semibold">Details:</span> {event.details}
          </div>

          {showDiff ? (
            <div className="col-span-full">
              <span className="font-semibold mb-2 block">Value Changes (Before / After):</span>
              <Diff
                className="rounded border border-base-300 w-full"
                aspectRatio="aspect-auto min-h-[16rem]"
                item1={
                  <div className="bg-error/10 w-full h-full p-4 overflow-auto">
                    <pre className="text-xs text-error">
                      {renderJson(event.oldValue)}
                    </pre>
                  </div>
                }
                item2={
                  <div className="bg-success/10 w-full h-full p-4 overflow-auto">
                    <pre className="text-xs text-success">
                      {renderJson(event.newValue)}
                    </pre>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              {event.oldValue !== undefined && (
                <div>
                  <span className="font-semibold">Previous Value:</span>
                  <pre className="mt-1 p-2 bg-base-300 rounded text-xs overflow-auto max-h-48">
                    {renderJson(event.oldValue)}
                  </pre>
                </div>
              )}
              {event.newValue !== undefined && (
                <div>
                  <span className="font-semibold">New Value:</span>
                  <pre className="mt-1 p-2 bg-base-300 rounded text-xs overflow-auto max-h-48">
                    {renderJson(event.newValue)}
                  </pre>
                </div>
              )}
            </>
          )}

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="col-span-full">
              <span className="font-semibold">Metadata:</span>
              <pre className="mt-1 p-2 bg-base-300 rounded text-xs overflow-auto max-h-48">
                {renderJson(event.metadata)}
              </pre>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const AuditPage: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // URL-persisted filters
  const { values: filters, setValue: setFilter } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    action: { type: 'string', default: '' },
    resource: { type: 'string', default: '' },
    dateFrom: { type: 'string', default: '' },
    dateTo: { type: 'string', default: '' },
    user: { type: 'string', default: '' },
  });

  // Build query URL
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.action) params.append('action', filters.action);
    if (filters.resource) params.append('resource', filters.resource);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.user) params.append('user', filters.user);
    params.append('limit', '200');
    const qs = params.toString();
    return `/api/audit${qs ? `?${qs}` : ''}`;
  }, [filters]);

  const {
    data: result,
    loading,
    error,
    refetch,
  } = useApiQuery<AuditResponse>(apiUrl, { ttl: 15_000 });

  const events: AuditEvent[] = result?.auditEvents ?? [];

  // Client-side text search as a fallback for quick filtering
  const filteredEvents = useMemo(() => {
    if (!filters.search) return events;
    const q = filters.search.toLowerCase();
    return events.filter(
      (e) =>
        e.user.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q),
    );
  }, [events, filters.search]);

  // Expand / collapse
  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // CSV export
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (filters.search) params.append('search', filters.search);
      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.user) params.append('user', filters.user);

      const res = await fetch(`/api/audit/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      debug('ERROR:', 'CSV export error:', err);
    } finally {
      setExporting(false);
    }
  }, [filters]);

  // Reset all filters
  const clearFilters = useCallback(() => {
    setFilter('search', '');
    setFilter('action', '');
    setFilter('resource', '');
    setFilter('dateFrom', '');
    setFilter('dateTo', '');
    setFilter('user', '');
  }, [setFilter]);

  const hasActiveFilters =
    filters.search || filters.action || filters.resource || filters.dateFrom || filters.dateTo || filters.user;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading && !result) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Review all administrative and system events"
        icon={<Shield className="w-6 h-6" />}
        gradient="primary"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => refetch()} aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="primary" onClick={handleExport} disabled={exporting}>
              <Download className="w-4 h-4 mr-1" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <div className="card-body p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Free-text search */}
            <div className="relative">
              <label htmlFor="audit-search" className="label label-text text-xs">
                Search
              </label>
              <Input
                id="audit-search"
                size="sm"
                placeholder="Search events..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
              {filters.search && (
                <button
                  className="absolute right-2 top-9 text-base-content/50 hover:text-base-content"
                  onClick={() => setFilter('search', '')}
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Action type */}
            <div>
              <label htmlFor="audit-action" className="label label-text text-xs">
                Action
              </label>
              <Select
                id="audit-action"
                size="sm"
                options={ACTION_OPTIONS}
                value={filters.action}
                onChange={(e) => setFilter('action', e.target.value)}
              />
            </div>

            {/* Resource type */}
            <div>
              <label htmlFor="audit-resource" className="label label-text text-xs">
                Resource
              </label>
              <Select
                id="audit-resource"
                size="sm"
                options={RESOURCE_OPTIONS}
                value={filters.resource}
                onChange={(e) => setFilter('resource', e.target.value)}
              />
            </div>

            {/* User / Actor */}
            <div>
              <label htmlFor="audit-user" className="label label-text text-xs">
                User
              </label>
              <Input
                id="audit-user"
                size="sm"
                placeholder="Filter by user..."
                value={filters.user}
                onChange={(e) => setFilter('user', e.target.value)}
              />
            </div>

            {/* Date From */}
            <div>
              <label htmlFor="audit-from" className="label label-text text-xs">
                From
              </label>
              <Input
                id="audit-from"
                type="date"
                size="sm"
                value={filters.dateFrom}
                onChange={(e) => setFilter('dateFrom', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <label htmlFor="audit-to" className="label label-text text-xs">
                To
              </label>
              <Input
                id="audit-to"
                type="date"
                size="sm"
                value={filters.dateTo}
                onChange={(e) => setFilter('dateTo', e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-base-300">
              <span className="text-sm text-base-content/60">
                Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </span>
              <Button size="xs" variant="ghost" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" /> Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Alert type="error">
          Failed to load audit events: {error.message}
        </Alert>
      )}

      {/* Table */}
      {filteredEvents.length === 0 && !loading ? (
        <EmptyState
          icon={<Search className="w-12 h-12" />}
          title="No audit events found"
          description={hasActiveFilters ? 'Try adjusting your filters.' : 'No events have been recorded yet.'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const isExpanded = expandedRows.has(event.id);
                  return (
                    <React.Fragment key={event.id}>
                      <tr
                        className="cursor-pointer hover:bg-base-200 transition-colors"
                        onClick={() => toggleRow(event.id)}
                      >
                        <td>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="whitespace-nowrap text-xs">{formatDate(event.timestamp)}</td>
                        <td className="font-mono text-xs">{event.user}</td>
                        <td>
                          <Badge variant="ghost" size="sm">
                            {event.action}
                          </Badge>
                        </td>
                        <td className="font-mono text-xs">{event.resource}</td>
                        <td>
                          <Badge variant={RESULT_BADGE[event.result] ?? 'ghost'} size="sm">
                            {event.result}
                          </Badge>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedRow event={event} />}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuditPage;
