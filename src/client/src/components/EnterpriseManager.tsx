/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Cloud,
  AlertCircle,
  AlertTriangle,
  Filter,
  Plus,
  Puzzle,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import Button from './DaisyUI/Button';
import { Alert } from './DaisyUI/Alert';
import Modal from './DaisyUI/Modal';
import Tabs from './DaisyUI/Tabs';
import type { TabItem } from './DaisyUI/Tabs';
import DataTable from './DaisyUI/DataTable';
import type { RDVColumn } from './DaisyUI/DataTable';

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'non-compliant' | 'checking';
  lastChecked: string;
  remediation?: string;
}

interface CloudProvider {
  id: string;
  name: string;
  type: 'aws' | 'azure' | 'gcp' | 'digitalocean' | 'heroku';
  region: string;
  status: 'connected' | 'disconnected' | 'configuring';
  resources: Array<{
    type: string;
    count: number;
    status: string;
  }>;
}

interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'database' | 'monitoring' | 'logging';
  provider: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  config: Record<string, any>;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'warning';
  details: string;
  ipAddress: string;
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
}

const enterpriseTabs: TabItem[] = [
  { key: 'security', label: 'Security & Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
  { key: 'cloud', label: 'Multi-Cloud', icon: <Cloud className="w-4 h-4" /> },
  { key: 'integrations', label: 'Integrations', icon: <Puzzle className="w-4 h-4" /> },
  { key: 'audit', label: 'Audit & Governance', icon: <Scale className="w-4 h-4" /> },
  { key: 'performance', label: 'Performance', icon: <BarChart3 className="w-4 h-4" /> },
];

const EnterpriseManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('security');
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [addIntegrationDialog, setAddIntegrationDialog] = useState(false);
  const [addCloudProviderDialog, setAddCloudProviderDialog] = useState(false);

  // Form data
  const [integrationForm, setIntegrationForm] = useState({
    name: '',
    type: 'webhook' as Integration['type'],
    provider: '',
    config: {} as Record<string, any>,
  });

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

  const [cloudForm, setCloudForm] = useState({
    name: '',
    type: 'aws' as CloudProvider['type'],
    region: '',
    credentials: {} as Record<string, any>,
  });

  useEffect(() => {
    loadEnterpriseData();
  }, []);

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from APIs
      // For now, we'll simulate enterprise data

      const mockComplianceRules: ComplianceRule[] = [
        {
          id: 'rule_1',
          name: 'Data Encryption at Rest',
          description: 'All sensitive data must be encrypted at rest',
          category: 'Security',
          severity: 'high',
          status: 'compliant',
          lastChecked: '2024-01-15T10:30:00Z',
        },
        {
          id: 'rule_2',
          name: 'Access Control',
          description: 'Role-based access control must be enforced',
          category: 'Security',
          severity: 'critical',
          status: 'compliant',
          lastChecked: '2024-01-15T10:30:00Z',
        },
        {
          id: 'rule_3',
          name: 'Audit Logging',
          description: 'All administrative actions must be logged',
          category: 'Compliance',
          severity: 'medium',
          status: 'non-compliant',
          lastChecked: '2024-01-15T10:30:00Z',
          remediation: 'Enable audit logging for all admin operations',
        },
      ];

      const mockCloudProviders: CloudProvider[] = [
        {
          id: 'aws_prod',
          name: 'AWS Production',
          type: 'aws',
          region: 'us-east-1',
          status: 'connected',
          resources: [
            { type: 'EC2', count: 3, status: 'running' },
            { type: 'RDS', count: 1, status: 'running' },
            { type: 'S3', count: 2, status: 'active' },
          ],
        },
        {
          id: 'azure_dev',
          name: 'Azure Development',
          type: 'azure',
          region: 'East US',
          status: 'connected',
          resources: [
            { type: 'VM', count: 2, status: 'running' },
            { type: 'Database', count: 1, status: 'running' },
          ],
        },
      ];

      const mockIntegrations: Integration[] = [
        {
          id: 'int_1',
          name: 'Slack Notifications',
          type: 'webhook',
          provider: 'Slack',
          status: 'active',
          lastSync: '2024-01-15T10:30:00Z',
          config: { webhookUrl: 'https://hooks.slack.com/...' },
        },
        {
          id: 'int_2',
          name: 'Datadog Monitoring',
          type: 'monitoring',
          provider: 'Datadog',
          status: 'active',
          lastSync: '2024-01-15T10:25:00Z',
          config: { apiKey: '***', appKey: '***' },
        },
        {
          id: 'int_3',
          name: 'PostgreSQL Database',
          type: 'database',
          provider: 'PostgreSQL',
          status: 'active',
          lastSync: '2024-01-15T10:20:00Z',
          config: { host: 'db.example.com', database: 'open_hivemind' },
        },
      ];

      const mockAuditEvents: AuditEvent[] = [
        {
          id: 'audit_1',
          timestamp: '2024-01-15T10:30:00Z',
          user: 'admin@example.com',
          action: 'CREATE_BOT',
          resource: 'bots/myBot',
          result: 'success',
          details: 'Created new bot instance',
          ipAddress: '192.168.1.100',
        },
        {
          id: 'audit_2',
          timestamp: '2024-01-15T10:25:00Z',
          user: 'user@example.com',
          action: 'UPDATE_CONFIG',
          resource: 'config/production',
          result: 'success',
          details: 'Updated LLM provider configuration',
          ipAddress: '192.168.1.101',
        },
      ];

      const mockPerformanceMetrics: PerformanceMetric[] = [
        {
          id: 'metric_1',
          name: 'API Response Time',
          value: 245,
          unit: 'ms',
          trend: 'down',
          threshold: 500,
          status: 'normal',
        },
        {
          id: 'metric_2',
          name: 'Memory Usage',
          value: 78,
          unit: '%',
          trend: 'up',
          threshold: 90,
          status: 'warning',
        },
        {
          id: 'metric_3',
          name: 'Error Rate',
          value: 0.5,
          unit: '%',
          trend: 'stable',
          threshold: 5,
          status: 'normal',
        },
      ];

      setComplianceRules(mockComplianceRules);
      setCloudProviders(mockCloudProviders);
      setIntegrations(mockIntegrations);
      setAuditEvents(mockAuditEvents);
      setPerformanceMetrics(mockPerformanceMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enterprise data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntegration = async () => {
    if (!integrationForm.name.trim() || !integrationForm.provider.trim()) {
      setError('Integration name and provider are required');
      return;
    }

    try {
      setLoading(true);
      // In a real implementation, this would create the integration via API
      const newIntegration: Integration = {
        id: `int_${Date.now()}`,
        name: integrationForm.name,
        type: integrationForm.type,
        provider: integrationForm.provider,
        status: 'active',
        lastSync: new Date().toISOString(),
        config: integrationForm.config,
      };

      setIntegrations((prev) => [...prev, newIntegration]);
      setSuccess('Integration added successfully!');
      setAddIntegrationDialog(false);
      setIntegrationForm({ name: '', type: 'webhook', provider: '', config: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add integration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCloudProvider = async () => {
    if (!cloudForm.name.trim() || !cloudForm.region.trim()) {
      setError('Cloud provider name and region are required');
      return;
    }

    try {
      setLoading(true);
      // In a real implementation, this would configure the cloud provider
      const newProvider: CloudProvider = {
        id: `${cloudForm.type}_${Date.now()}`,
        name: cloudForm.name,
        type: cloudForm.type,
        region: cloudForm.region,
        status: 'configuring',
        resources: [],
      };

      setCloudProviders((prev) => [...prev, newProvider]);
      setSuccess('Cloud provider added successfully!');
      setAddCloudProviderDialog(false);
      setCloudForm({ name: '', type: 'aws', region: '', credentials: {} });

      // Simulate configuration completion
      setTimeout(() => {
        setCloudProviders((prev) =>
          prev.map((provider) =>
            provider.id === newProvider.id
              ? { ...provider, status: 'connected' as const }
              : provider
          )
        );
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cloud provider');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 'compliant':
        return 'badge-success';
      case 'inactive':
      case 'disconnected':
      case 'non-compliant':
        return 'badge-error';
      case 'configuring':
      case 'checking':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'badge-error';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'badge-info';
      case 'low':
        return 'badge-success';
      default:
        return 'badge-ghost';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'security': // Security & Compliance
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Compliance Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {complianceRules.map((rule) => (
                <div key={rule.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="card-title text-base">{rule.name}</h3>
                        <p className="text-sm text-base-content/70">{rule.category}</p>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <div className={`badge ${getSeverityColor(rule.severity)} badge-sm`}>
                          {rule.severity}
                        </div>
                        <div className={`badge ${getStatusColor(rule.status)} badge-sm`}>
                          {rule.status}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{rule.description}</p>
                    {rule.remediation && (
                      <Alert status="warning" className="text-sm py-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{rule.remediation}</span>
                      </Alert>
                    )}
                    <div className="text-xs text-base-content/50 mt-2">
                      Last checked: {new Date(rule.lastChecked).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'cloud': // Multi-Cloud
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Cloud Providers</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddCloudProviderDialog(true)}
                disabled={loading} aria-busy={loading}
                aria-label="Add a new cloud provider"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Provider
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cloudProviders.map((provider) => (
                <div key={provider.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="card-title text-base">{provider.name}</h3>
                        <p className="text-sm text-base-content/70">
                          {provider.type.toUpperCase()} • {provider.region}
                        </p>
                      </div>
                      <div className={`badge ${getStatusColor(provider.status)}`}>
                        {provider.status}
                      </div>
                    </div>
                    <p className="text-sm font-semibold mb-1">Resources:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.resources.map((resource, index) => (
                        <div key={index} className="badge badge-outline badge-sm">
                          {resource.type}: {resource.count}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'integrations': // Integrations
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Enterprise Integrations</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAddIntegrationDialog(true)}
                disabled={loading} aria-busy={loading}
                aria-label="Add a new enterprise integration"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Integration
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="card-title text-base">{integration.name}</h3>
                        <p className="text-sm text-base-content/70">
                          {integration.provider} • {integration.type}
                        </p>
                      </div>
                      <div className={`badge ${getStatusColor(integration.status)} badge-sm`}>
                        {integration.status}
                      </div>
                    </div>
                    <p className="text-sm mb-2">
                      Last sync: {new Date(integration.lastSync).toLocaleString()}
                    </p>
                    <div className="card-actions justify-end">
                      <Button variant="primary" buttonStyle="outline" size="xs" aria-label={`Configure ${integration.name}`}>Configure</Button>
                      <Button variant="primary" buttonStyle="outline" size="xs" aria-label={`Test ${integration.name}`}>Test</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'audit': // Audit & Governance
        return (
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
                      aria-label="Search audit events by user or resource"
                    />
                  </div>
                </div>
                <select
                  className="select select-sm select-bordered"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  aria-label="Filter by action"
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
                  aria-label="Filter by result"
                >
                  <option value="all">All Results</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="warning">Warning</option>
                </select>
                <Button
                  variant="primary"
                  buttonStyle="outline"
                  size="sm"
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
                </Button>
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
        );

      case 4: // Performance Optimization
        return (
          <div>
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
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
                      <Button variant="primary" buttonStyle="outline" size="sm" aria-label={`Optimize ${metric.name}`}>Optimize</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Enterprise Manager</h1>
        <Button variant="primary" buttonStyle="outline" onClick={loadEnterpriseData} disabled={loading} aria-busy={loading} aria-label="Refresh enterprise data">
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert status="error" className="mb-4" onClose={() => setError(null)}>
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </Alert>
      )}

      {success && (
        <Alert status="success" className="mb-4" onClose={() => setSuccess(null)}>
          <CheckCircle2 className="w-6 h-6" />
          <span>{success}</span>
        </Alert>
      )}

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6 bg-base-200 p-1" role="tablist" aria-label="Enterprise Manager sections">
        <a className={`tab ${activeTab === 0 ? 'tab-active' : ''}`} onClick={() => setActiveTab(0)} role="tab" aria-selected={activeTab === 0}>
          <ShieldCheck className="w-4 h-4 mr-2" />
          Security & Compliance
        </a>
        <a className={`tab ${activeTab === 1 ? 'tab-active' : ''}`} onClick={() => setActiveTab(1)} role="tab" aria-selected={activeTab === 1}>
          <Cloud className="w-4 h-4 mr-2" />
          Multi-Cloud
        </a>
        <a className={`tab ${activeTab === 2 ? 'tab-active' : ''}`} onClick={() => setActiveTab(2)} role="tab" aria-selected={activeTab === 2}>
          <Puzzle className="w-4 h-4 mr-2" />
          Integrations
        </a>
        <a className={`tab ${activeTab === 3 ? 'tab-active' : ''}`} onClick={() => setActiveTab(3)} role="tab" aria-selected={activeTab === 3}>
          <Scale className="w-4 h-4 mr-2" />
          Audit & Governance
        </a>
        <a className={`tab ${activeTab === 4 ? 'tab-active' : ''}`} onClick={() => setActiveTab(4)} role="tab" aria-selected={activeTab === 4}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Performance
        </a>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Add Integration Dialog */}
      <dialog
        className={`modal ${addIntegrationDialog ? 'modal-open' : ''}`}
        aria-modal="true"
        aria-labelledby="add-integration-dialog-title"
      >
        <div className="modal-box">
          <h3 id="add-integration-dialog-title" className="font-bold text-lg mb-4">Add Integration</h3>
          <div className="form-control w-full mb-4">
            <label htmlFor="integration-name" className="label">
              <span className="label-text">Integration Name</span>
            </label>
            <input
              id="integration-name"
              type="text"
              className="input input-bordered w-full"
              value={integrationForm.name}
              onChange={(e) => setIntegrationForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="integration-type" className="label">
              <span className="label-text">Type</span>
            </label>
            <select
              id="integration-type"
              className="select select-bordered w-full"
              value={integrationForm.type}
              onChange={(e) =>
                setIntegrationForm((prev) => ({
                  ...prev,
                  type: e.target.value as Integration['type'],
                }))
              }
            >
              <option value="webhook">Webhook</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="monitoring">Monitoring</option>
              <option value="logging">Logging</option>
            </select>
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="integration-provider" className="label">
              <span className="label-text">Provider</span>
            </label>
            <input
              id="integration-provider"
              type="text"
              className="input input-bordered w-full"
              value={integrationForm.provider}
              onChange={(e) =>
                setIntegrationForm((prev) => ({ ...prev, provider: e.target.value }))
              }
            />
          </div>
          <div className="modal-action">
            <Button variant="primary" buttonStyle="outline" onClick={() => setAddIntegrationDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddIntegration}
              disabled={loading || !integrationForm.name.trim() || !integrationForm.provider.trim()}
            >
              {loading ? 'Adding...' : 'Add Integration'}
            </Button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setAddIntegrationDialog(false)} aria-label="Close add integration dialog">close</button>
        </form>
      </dialog>

      {/* Add Cloud Provider Dialog */}
      <dialog
        className={`modal ${addCloudProviderDialog ? 'modal-open' : ''}`}
        aria-modal="true"
        aria-labelledby="add-cloud-provider-dialog-title"
      >
        <div className="modal-box">
          <h3 id="add-cloud-provider-dialog-title" className="font-bold text-lg mb-4">Add Cloud Provider</h3>
          <div className="form-control w-full mb-4">
            <label htmlFor="cloud-provider-name" className="label">
              <span className="label-text">Provider Name</span>
            </label>
            <input
              id="cloud-provider-name"
              type="text"
              className="input input-bordered w-full"
              value={cloudForm.name}
              onChange={(e) => setCloudForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="cloud-type" className="label">
              <span className="label-text">Cloud Type</span>
            </label>
            <select
              id="cloud-type"
              className="select select-bordered w-full"
              value={cloudForm.type}
              onChange={(e) =>
                setCloudForm((prev) => ({ ...prev, type: e.target.value as CloudProvider['type'] }))
              }
            >
              <option value="aws">Amazon Web Services</option>
              <option value="azure">Microsoft Azure</option>
              <option value="gcp">Google Cloud Platform</option>
              <option value="digitalocean">DigitalOcean</option>
              <option value="heroku">Heroku</option>
            </select>
          </div>
          <div className="form-control w-full mb-4">
            <label htmlFor="cloud-region" className="label">
              <span className="label-text">Region</span>
            </label>
            <input
              id="cloud-region"
              type="text"
              className="input input-bordered w-full"
              value={cloudForm.region}
              onChange={(e) => setCloudForm((prev) => ({ ...prev, region: e.target.value }))}
            />
          </div>
          <div className="modal-action">
            <Button variant="primary" buttonStyle="outline" onClick={() => setAddCloudProviderDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddCloudProvider}
              disabled={loading || !cloudForm.name.trim() || !cloudForm.region.trim()}
            >
              {loading ? 'Adding...' : 'Add Provider'}
            </Button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setAddCloudProviderDialog(false)} aria-label="Close add cloud provider dialog">close</button>
        </form>
      </dialog>
    </div>
  );
};

export default EnterpriseManager;
