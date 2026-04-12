/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback } from 'react';
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
import CodeBlock from '../components/DaisyUI/CodeBlock';
import Input from '../components/DaisyUI/Input';
import Select from '../components/DaisyUI/Select';
import PageHeader from '../components/DaisyUI/PageHeader';
import EmptyState from '../components/DaisyUI/EmptyState';
import { Alert } from '../components/DaisyUI/Alert';
import useUrlParams from '../hooks/useUrlParams';
import { apiService } from '../services/api';
import Diff from '../components/DaisyUI/Diff';
import SimpleTable from '../components/DaisyUI/SimpleTable';
import Debug from 'debug';
const debug = Debug('app:client:pages:AuditPage');

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'warning';
  details: string;
  ipAddress?: string;
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
                  <CodeBlock variant="error" maxHeight="max-h-none">
                    {renderJson(event.oldValue)}
                  </CodeBlock>
                }
                item2={
                  <CodeBlock variant="success" maxHeight="max-h-none">
                    {renderJson(event.newValue)}
                  </CodeBlock>
                }
              />
            </div>
          ) : (
            <>
              {event.oldValue !== undefined && (
                <div>
                  <span className="font-semibold">Previous Value:</span>
                  <CodeBlock>
                    {renderJson(event.oldValue)}
                  </CodeBlock>
                </div>
              )}
              {event.newValue !== undefined && (
                <div>
                  <span className="font-semibold">New Value:</span>
                  <CodeBlock>
                    {renderJson(event.newValue)}
                  </CodeBlock>
                </div>
              )}
            </>
          )}

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="col-span-full">
              <span className="font-semibold">Metadata:</span>
              <CodeBlock>
                {renderJson(event.metadata)}
              </CodeBlock>
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
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');

  const fetchAuditEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await apiService.get('/api/admin/audit-logs?limit=100');
      setAuditEvents(data?.data?.auditEvents ?? data?.auditEvents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      setAuditEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const filteredEvents = auditEvents.filter((event) => {
    const matchesSearch =
      searchTerm === '' ||
      event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || event.action === actionFilter;
    const matchesResult = resultFilter === 'all' || event.result === resultFilter;

    return matchesSearch && matchesAction && matchesResult;
  });

  const uniqueActions = Array.from(new Set(auditEvents.map((e) => e.action)));

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success':
        return 'badge-success';
      case 'failure':
        return 'badge-error';
      case 'warning':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        title="Audit Log"
        icon={<ShieldCheck className="w-8 h-8" />}
        gradient="warning"
        actions={
          <Button
            buttonStyle="outline"
            onClick={fetchAuditEvents}
            disabled={loading}
            aria-label="Refresh audit logs"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="alert alert-error mb-4">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            aria-label="Close error message"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="form-control">
          <input
            type="text"
            placeholder="Search user, resource..."
            className="input input-sm input-bordered"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="select select-sm select-bordered"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All Actions</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          className="select select-sm select-bordered"
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
        >
          <option value="all">All Results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="warning">Warning</option>
        </select>
        <Button
          buttonStyle="outline"
          size="sm"
          onClick={() => {
            setSearchTerm('');
            setActionFilter('all');
            setResultFilter('all');
          }}
          disabled={!searchTerm && actionFilter === 'all' && resultFilter === 'all'}
          aria-label="Clear audit filters"
        >
          <Filter className="w-4 h-4 mr-1" /> Clear Filters
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/60">
          <ShieldCheck className="w-16 h-16 mb-4" />
          <p className="text-lg font-semibold">No audit logs</p>
          <p className="text-sm mt-1">
            {auditEvents.length === 0
              ? 'No audit events have been recorded yet.'
              : 'No audit events match the current filters.'}
          </p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <SimpleTable size="sm" className="w-full">
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
            </SimpleTable>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AuditPage;
