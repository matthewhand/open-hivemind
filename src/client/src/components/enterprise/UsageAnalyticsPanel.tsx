import React, { useState } from 'react';
import { useEnterprise, AuditEvent } from './EnterpriseContext';
import DataTable from '../DaisyUI/DataTable';
import type { RDVColumn } from '../DaisyUI/DataTable';
import { Filter } from 'lucide-react';

const UsageAnalyticsPanel: React.FC = () => {
  const { auditEvents, performanceMetrics } = useEnterprise();

  // Audit Query states
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditResultFilter, setAuditResultFilter] = useState('all');

  const filteredAuditEvents = auditEvents.filter((event) => {
    const matchesSearch =
      auditSearchTerm === '' ||
      event.user.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
      event.resource.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
      event.details.toLowerCase().includes(auditSearchTerm.toLowerCase());

    const matchesAction = auditActionFilter === 'all' || event.action === auditActionFilter;
    const matchesResult = auditResultFilter === 'all' || event.result === auditResultFilter;

    return matchesSearch && matchesAction && matchesResult;
  });

  const uniqueActions = Array.from(new Set(auditEvents.map((e) => e.action)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 'compliant':
      case 'success':
      case 'normal':
        return 'badge-success';
      case 'inactive':
      case 'disconnected':
      case 'non-compliant':
      case 'failure':
      case 'critical':
        return 'badge-error';
      case 'configuring':
      case 'checking':
      case 'warning':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <div className="space-y-8">
      {/* Performance Optimization Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance Metrics & Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {performanceMetrics.map((metric) => (
            <div key={metric.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="card-title text-base">{metric.name}</h3>
                  <div className={`badge ${getStatusColor(metric.status)} badge-sm`}>
                    {metric.status}
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {metric.value}{' '}
                  <span className="text-lg font-normal text-base-content/70">
                    {metric.unit}
                  </span>
                </div>
                <div className="flex items-center mb-2 text-sm text-base-content/70">
                  <span className="mr-2">
                    Threshold: {metric.threshold} {metric.unit}
                  </span>
                  {metric.trend === 'up' && <span className="text-error">↗</span>}
                  {metric.trend === 'down' && <span className="text-success">↘</span>}
                  {metric.trend === 'stable' && <span>→</span>}
                </div>
                <div className="card-actions justify-end">
                  <button className="btn btn-sm btn-outline" aria-label={`Optimize ${metric.name}`}>Optimize</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit & Governance Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Audit Events</h2>
          <div className="flex gap-2">
            <div className="form-control">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search user, resource..."
                  className="input input-sm input-bordered"
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <select
              className="select select-sm select-bordered"
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
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
              value={auditResultFilter}
              onChange={(e) => setAuditResultFilter(e.target.value)}
            >
              <option value="all">All Results</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
            </select>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                setAuditSearchTerm('');
                setAuditActionFilter('all');
                setAuditResultFilter('all');
              }}
              disabled={
                !auditSearchTerm && auditActionFilter === 'all' && auditResultFilter === 'all'
              }
              aria-label="Clear audit filters"
            >
              <Filter className="w-4 h-4 mr-1" /> Clear Filters
            </button>
          </div>
        </div>
        <div className="bg-base-100 rounded-box shadow">
          <DataTable<AuditEvent>
            data={filteredAuditEvents}
            columns={[
              {
                key: 'timestamp',
                title: 'Timestamp',
                sortable: true,
                render: (value: string) => <span className="text-sm">{new Date(value).toLocaleString()}</span>,
              },
              { key: 'user', title: 'User', prominent: true },
              {
                key: 'action',
                title: 'Action',
                render: (value: string) => <div className="badge badge-ghost badge-sm">{value}</div>,
              },
              { key: 'resource', title: 'Resource' },
              {
                key: 'details',
                title: 'Details',
                render: (value: string) => (
                  <span className="text-xs max-w-xs truncate" title={value}>{value}</span>
                ),
              },
              {
                key: 'result',
                title: 'Result',
                render: (value: string) => (
                  <div className={`badge ${getStatusColor(value)} badge-sm`}>{value}</div>
                ),
              },
              {
                key: 'ipAddress',
                title: 'IP Address',
                render: (value: string) => <span className="font-mono text-xs">{value}</span>,
              },
            ] as RDVColumn<AuditEvent>[]}
            rowKey={(e) => e.id}
            emptyState={
              <div className="text-center py-4 opacity-50">
                No audit events match the current structured query.
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default UsageAnalyticsPanel;
