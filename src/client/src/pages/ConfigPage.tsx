import React, { useState, useEffect, useCallback } from 'react';
import IntegrationsPanel from '../components/IntegrationsPanel';
import PageHeader from '../components/DaisyUI/PageHeader';
import Card from '../components/DaisyUI/Card';
import StatsCards from '../components/DaisyUI/StatsCards';
import { SkeletonPage } from '../components/DaisyUI/Skeleton';
import { Alert } from '../components/DaisyUI/Alert';
import Button from '../components/DaisyUI/Button';
import { Plug, RefreshCw, Boxes, KeyRound, ShieldCheck } from 'lucide-react';
import { apiService } from '../services/api';

interface IntegrationSummary {
  llm: number;
  message: number;
  memory: number;
  tool: number;
}

const ConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationSummary>({ llm: 0, message: 0, memory: 0, tool: 0 });

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch provider counts from the marketplace API
      const data: any = await apiService.get('/api/marketplace/packages');
      const packages = Array.isArray(data) ? data : [];
      const summary: IntegrationSummary = { llm: 0, message: 0, memory: 0, tool: 0 };
      packages.forEach((p: any) => {
        if (p.type === 'llm' && p.status !== 'available') summary.llm++;
        if (p.type === 'message' && p.status !== 'available') summary.message++;
        if (p.type === 'memory' && p.status !== 'available') summary.memory++;
        if (p.type === 'tool' && p.status !== 'available') summary.tool++;
      });
      setIntegrations(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const stats = [
    {
      id: 'llm-providers',
      title: 'LLM Providers',
      value: integrations.llm,
      icon: <KeyRound className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'message-providers',
      title: 'Message Providers',
      value: integrations.message,
      icon: <Plug className="w-8 h-8" />,
      color: 'secondary' as const,
    },
    {
      id: 'memory',
      title: 'Memory Integrations',
      value: integrations.memory,
      icon: <Boxes className="w-8 h-8" />,
      color: 'accent' as const,
    },
    {
      id: 'tools',
      title: 'Tool Integrations',
      value: integrations.tool,
      icon: <ShieldCheck className="w-8 h-8" />,
      color: 'info' as const,
    },
  ];

  if (loading) {
    return <SkeletonPage statsCount={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations & Configuration"
        description="Manage system integrations and global defaults."
        icon={Plug}
        gradient="secondary"
        actions={
          <Button variant="outline" size="sm" onClick={fetchIntegrations} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Error Alert */}
      {error && (
        <Alert status="error" onClose={() => setError(null)}>
          <span>{error}</span>
          <Button variant="outline" size="xs" onClick={fetchIntegrations}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Integration Stats */}
      <StatsCards stats={stats} isLoading={loading} />

      {/* Integrations Panel */}
      <Card>
        <Card.Title tag="h3">Active Integrations</Card.Title>
        <IntegrationsPanel />
      </Card>
    </div>
  );
};

export default ConfigPage;
