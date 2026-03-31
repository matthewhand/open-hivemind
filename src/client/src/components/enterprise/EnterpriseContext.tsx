import React, { createContext, useContext, useState, useEffect } from 'react';

// Interfaces based on EnterpriseManager.tsx
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'compliant' | 'non-compliant' | 'checking';
  lastChecked: string;
  remediation?: string;
}

export interface CloudProvider {
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

export interface Integration {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'database' | 'monitoring' | 'logging';
  provider: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  config: Record<string, any>;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'warning';
  details: string;
  ipAddress: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
}

interface EnterpriseContextState {
  complianceRules: ComplianceRule[];
  cloudProviders: CloudProvider[];
  integrations: Integration[];
  auditEvents: AuditEvent[];
  performanceMetrics: PerformanceMetric[];
  loading: boolean;
  error: string | null;
  success: string | null;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  loadEnterpriseData: () => Promise<void>;
  handleAddIntegration: (form: any) => Promise<void>;
  handleAddCloudProvider: (form: any) => Promise<void>;
}

const EnterpriseContext = createContext<EnterpriseContextState | undefined>(undefined);

export const useEnterprise = () => {
  const context = useContext(EnterpriseContext);
  if (!context) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider');
  }
  return context;
};

export const EnterpriseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);
      // Simulating API call
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

  const handleAddIntegration = async (integrationForm: any) => {
    try {
      setLoading(true);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add integration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCloudProvider = async (cloudForm: any) => {
    try {
      setLoading(true);
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

  useEffect(() => {
    loadEnterpriseData();
  }, []);

  return (
    <EnterpriseContext.Provider
      value={{
        complianceRules,
        cloudProviders,
        integrations,
        auditEvents,
        performanceMetrics,
        loading,
        error,
        success,
        setError,
        setSuccess,
        loadEnterpriseData,
        handleAddIntegration,
        handleAddCloudProvider,
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  );
};
