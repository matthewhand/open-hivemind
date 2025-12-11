import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Badge, Button, Card, Toggle } from '../DaisyUI';
import { Puzzle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'messaging' | 'ai' | 'database' | 'monitoring' | 'other';
  enabled: boolean;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

const SettingsIntegrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/global');
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      
      const config = data.config || {};
      
      // Build integrations from config
      const builtIntegrations: Integration[] = [
        {
          id: 'discord',
          name: 'Discord',
          description: 'Discord bot for community management',
          category: 'messaging',
          enabled: !!config.discord?.botToken?.value,
          configured: !!config.discord?.botToken?.value,
          status: config.discord?.botToken?.value ? 'connected' : 'disconnected'
        },
        {
          id: 'slack',
          name: 'Slack',
          description: 'Slack workspace integration',
          category: 'messaging',
          enabled: !!config.slack?.botToken?.value,
          configured: !!config.slack?.botToken?.value,
          status: config.slack?.botToken?.value ? 'connected' : 'disconnected'
        },
        {
          id: 'mattermost',
          name: 'Mattermost',
          description: 'Self-hosted team communication',
          category: 'messaging',
          enabled: !!config.mattermost?.url?.value,
          configured: !!config.mattermost?.url?.value,
          status: config.mattermost?.url?.value ? 'connected' : 'disconnected'
        },
        {
          id: 'openai',
          name: 'OpenAI',
          description: 'GPT models and embeddings',
          category: 'ai',
          enabled: !!config.openai?.apiKey?.value,
          configured: !!config.openai?.apiKey?.value,
          status: config.openai?.apiKey?.value ? 'connected' : 'disconnected'
        },
        {
          id: 'flowise',
          name: 'Flowise',
          description: 'Visual LLM orchestration',
          category: 'ai',
          enabled: !!config.flowise?.baseUrl?.value,
          configured: !!config.flowise?.baseUrl?.value,
          status: config.flowise?.baseUrl?.value ? 'connected' : 'disconnected'
        }
      ];
      
      setIntegrations(builtIntegrations);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to load integrations' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-error" />;
      default: return <XCircle className="w-4 h-4 text-base-content/50" />;
    }
  };

  const getStatusVariant = (status: string): 'success' | 'neutral' | 'error' => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      default: return 'neutral';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'messaging': return 'bg-primary';
      case 'ai': return 'bg-secondary';
      case 'monitoring': return 'bg-warning';
      default: return 'bg-accent';
    }
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const configuredCount = integrations.filter(i => i.configured).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Puzzle className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">Integrations</h5>
          <p className="text-sm text-base-content/70">Manage third-party service connections</p>
        </div>
      </div>

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat bg-base-200/50 rounded-lg p-3">
          <div className="stat-title text-xs">Total</div>
          <div className="stat-value text-2xl">{integrations.length}</div>
        </div>
        <div className="stat bg-base-200/50 rounded-lg p-3">
          <div className="stat-title text-xs">Connected</div>
          <div className="stat-value text-2xl text-success">{connectedCount}</div>
        </div>
        <div className="stat bg-base-200/50 rounded-lg p-3">
          <div className="stat-title text-xs">Configured</div>
          <div className="stat-value text-2xl text-info">{configuredCount}</div>
        </div>
      </div>

      {/* Integration Groups */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category}>
          <h6 className="text-md font-semibold capitalize mb-3 flex items-center gap-2">
            <span className={`w-2 h-2 ${getCategoryColor(category)} rounded-full`}></span>
            {category} Integrations
          </h6>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryIntegrations.map((integration) => (
              <Card key={integration.id} className="bg-base-200/50 p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{integration.name}</h4>
                  <Badge variant={getStatusVariant(integration.status)} size="sm">
                    {getStatusIcon(integration.status)}
                    <span className="ml-1">{integration.status}</span>
                  </Badge>
                </div>

                <p className="text-xs text-base-content/70 mb-3">
                  {integration.description}
                </p>

                <div className="flex items-center justify-between">
                  <Toggle
                    checked={integration.enabled}
                    disabled={!integration.configured}
                    size="sm"
                  />
                  {!integration.configured && (
                    <span className="text-xs text-warning">Needs config</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <div className="alert alert-info">
        <div>
          <span className="text-sm">
            Integration credentials are configured via environment variables or the Advanced Config tab.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SettingsIntegrations;