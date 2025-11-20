import React, { useState } from 'react';
import { Alert, Badge, Button, Card, Divider, Toggle } from '../DaisyUI';
import {
  PuzzlePieceIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'messaging' | 'ai' | 'database' | 'monitoring' | 'other';
  enabled: boolean;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error';
  config?: Record<string, any>;
}

const SettingsIntegrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'discord',
      name: 'Discord',
      description: 'Discord bot integration for community management',
      category: 'messaging',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slack workspace integration for team collaboration',
      category: 'messaging',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'mattermost',
      name: 'Mattermost',
      description: 'Self-hosted team communication platform',
      category: 'messaging',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      description: 'Telegram bot for instant messaging',
      category: 'messaging',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models and AI capabilities',
      category: 'ai',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Claude AI assistant integration',
      category: 'ai',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'flowise',
      name: 'Flowise',
      description: 'Visual LLM orchestration platform',
      category: 'ai',
      enabled: true,
      configured: true,
      status: 'connected'
    },
    {
      id: 'prometheus',
      name: 'Prometheus',
      description: 'Metrics collection and monitoring',
      category: 'monitoring',
      enabled: false,
      configured: false,
      status: 'disconnected'
    },
    {
      id: 'grafana',
      name: 'Grafana',
      description: 'Metrics visualization and dashboards',
      category: 'monitoring',
      enabled: false,
      configured: false,
      status: 'disconnected'
    }
  ]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleToggleIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (!integration) return;

    if (!integration.configured && !integration.enabled) {
      setAlert({ type: 'error', message: 'Please configure this integration before enabling it' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    setIntegrations(prev => prev.map(integration =>
      integration.id === id
        ? {
          ...integration,
          enabled: !integration.enabled,
          status: !integration.enabled ? 'connected' : 'disconnected'
        }
        : integration
    ));

    setAlert({
      type: 'success',
      message: `${integration.name} ${!integration.enabled ? 'enabled' : 'disabled'} successfully`
    });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleConfigure = (id: string) => {
    // In a real app, this would open a configuration dialog
    setAlert({ type: 'success', message: 'Configuration dialog would open here' });
    setTimeout(() => setAlert(null), 3000);
  };

  const getCategoryVariant = (category: string): 'primary' | 'secondary' | 'accent' | 'warning' => {
    switch (category) {
      case 'messaging': return 'primary';
      case 'ai': return 'secondary';
      case 'monitoring': return 'warning';
      default: return 'accent';
    }
  };

  const getStatusVariant = (status: string): 'success' | 'neutral' | 'error' => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'neutral';
      case 'error': return 'error';
      default: return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    const className = "w-4 h-4";
    switch (status) {
      case 'connected': return <CheckCircleIcon className={`${className} text-success`} />;
      case 'error': return <ExclamationTriangleIcon className={`${className} text-error`} />;
      default: return <XCircleIcon className={`${className} text-base-content/50`} />;
    }
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <PuzzlePieceIcon className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-base-content/70">
            Manage third-party integrations and external service connections
          </p>
        </div>
      </div>

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
          <section key={category}>
            <h3 className="text-lg font-semibold capitalize mb-4 border-b border-base-300 pb-2">
              {category} Integrations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryIntegrations.map((integration) => (
                <Card key={integration.id} className="h-full flex flex-col">
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-lg font-semibold">{integration.name}</h4>
                      <div className="flex gap-1">
                        <Badge variant={getStatusVariant(integration.status)} size="sm">
                          {getStatusIcon(integration.status)}
                          {integration.status}
                        </Badge>
                        <Badge
                          variant={getCategoryVariant(integration.category)}
                          size="sm"
                          style="outline"
                        >
                          {integration.category}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-base-content/70 mb-4">
                      {integration.description}
                    </p>

                    <div className="mb-3">
                      <Toggle
                        label={integration.enabled ? 'Enabled' : 'Disabled'}
                        checked={integration.enabled}
                        onChange={() => handleToggleIntegration(integration.id)}
                        disabled={!integration.configured}
                        color="primary"
                      />
                    </div>

                    {!integration.configured && (
                      <p className="text-sm text-warning">
                        ⚠️ Configuration required
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-base-200">
                    <Button
                      size="sm"
                      onClick={() => handleConfigure(integration.id)}
                      variant={integration.configured ? 'secondary' : 'primary'}
                      buttonStyle={integration.configured ? 'outline' : 'solid'}
                      className="w-full"
                    >
                      {integration.configured ? 'Reconfigure' : 'Configure'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Divider />

      {/* Integration Statistics */}
      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Integration Statistics</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center">
            <div className="text-sm text-base-content/70">Total Integrations</div>
            <div className="text-3xl font-bold">{integrations.length}</div>
          </Card>

          <Card className="text-center">
            <div className="text-sm text-base-content/70">Enabled</div>
            <div className="text-3xl font-bold text-success">
              {integrations.filter(i => i.enabled).length}
            </div>
          </Card>

          <Card className="text-center">
            <div className="text-sm text-base-content/70">Configured</div>
            <div className="text-3xl font-bold text-info">
              {integrations.filter(i => i.configured).length}
            </div>
          </Card>

          <Card className="text-center">
            <div className="text-sm text-base-content/70">Connected</div>
            <div className="text-3xl font-bold text-primary">
              {integrations.filter(i => i.status === 'connected').length}
            </div>
          </Card>
        </div>
      </section>

      <div className="flex justify-end mt-8">
        <Button variant="secondary" buttonStyle="outline" size="lg">
          Refresh All Connections
        </Button>
      </div>
    </div>
  );
};

export default SettingsIntegrations;