/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import {
  ArrowPathIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/DaisyUI/Button';

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <Button
          buttonStyle="outline"
          onClick={fetchAuditEvents}
          disabled={loading}
          aria-label="Refresh audit logs"
        >
          <ArrowPathIcon className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <ExclamationCircleIcon className="w-6 h-6" />
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
          <FunnelIcon className="w-4 h-4 mr-1" /> Clear Filters
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-base-content/60">
          <ShieldCheckIcon className="w-16 h-16 mb-4" />
          <p className="text-lg font-semibold">No audit logs</p>
          <p className="text-sm mt-1">
            {auditEvents.length === 0
              ? 'No audit events have been recorded yet.'
              : 'No audit events match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-base-100 rounded-box shadow">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>Result</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td className="text-sm">{new Date(event.timestamp).toLocaleString()}</td>
                  <td>{event.user}</td>
                  <td>
                    <div className="badge badge-ghost badge-sm">{event.action}</div>
                  </td>
                  <td>{event.resource}</td>
                  <td className="text-xs max-w-xs truncate" title={event.details}>
                    {event.details}
                  </td>
                  <td>
                    <div className={`badge ${getResultColor(event.result)} badge-sm`}>
                      {event.result}
                    </div>
                  </td>
                  <td className="font-mono text-xs">{event.ipAddress ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditPage;
