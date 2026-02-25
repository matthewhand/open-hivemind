/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useModal } from '../hooks/useModal';
import { Card, Button, Badge, PageHeader, StatsCards } from '../components/DaisyUI';
import {
  MessageCircle,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Radio,
  RefreshCw,
} from 'lucide-react';
import type { MessageProviderType} from '../types/bot';
import { MESSAGE_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import SearchFilterBar from '../components/SearchFilterBar';

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, closeModal } = useModal();
  const [configuredProviders, setConfiguredProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/config/message-profiles');
      if (response.ok) {
        const data = await response.json();
        setConfiguredProviders(data.profiles.message || []);
      }
    } catch (error) {
      console.error('Failed to fetch message profiles:', error);
    } finally {
        setLoading(false);
    }
  };

  const handleAddProvider = (providerType: MessageProviderType) => {
    openAddModal('global', 'message');
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      const key = providerData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const payload = {
        key,
        name: providerData.name,
        provider: providerData.type,
        config: providerData.config,
      };

      const response = await fetch('/api/config/message-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchProviders();
        closeModal();
      } else {
        const error = await response.json();
        console.error('Failed to create provider:', error);
      }
    } catch (error) {
      console.error('Error submitting provider:', error);
    }
  };

  const providerTypes = Object.keys(MESSAGE_PROVIDER_CONFIGS) as MessageProviderType[];
  const filteredProviderTypes = providerTypes.filter(type =>
      MESSAGE_PROVIDER_CONFIGS[type].displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    {
      id: 'total',
      title: 'Configured',
      value: configuredProviders.length,
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'success' as const,
    },
    {
      id: 'available',
      title: 'Available Types',
      value: providerTypes.length,
      icon: <Radio className="w-8 h-8" />,
      color: 'primary' as const,
    },
     {
      id: 'active',
      title: 'Active Platforms',
      value: new Set(configuredProviders.map(p => p.provider)).size,
      description: 'Unique platforms used',
      icon: <MessageCircle className="w-8 h-8" />,
      color: 'secondary' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Platforms"
        description="Configure messaging platforms for your bots to connect and communicate"
        icon={MessageCircle}
        actions={
            <Button
                variant="ghost"
                onClick={fetchProviders}
                disabled={loading}
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
        }
      />

      <StatsCards stats={stats} isLoading={loading} />

      {/* Configured Providers */}
      {configuredProviders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Configured Platforms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configuredProviders.map((provider) => {
              const config = MESSAGE_PROVIDER_CONFIGS[provider.provider as MessageProviderType] || MESSAGE_PROVIDER_CONFIGS.webhook;
              return (
                <Card key={provider.key} className="bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-base-200 text-xl">{config.icon}</div>
                        <div>
                            <h3 className="card-title text-base">{provider.name}</h3>
                            <div className="text-xs opacity-60 capitalize">{provider.provider}</div>
                        </div>
                      </div>
                      <Badge variant="success" size="sm" style="outline">Active</Badge>
                    </div>
                    <p className="text-sm text-base-content/60 mb-4 line-clamp-2">{provider.description || config.description}</p>
                    <div className="card-actions justify-end mt-auto">
                      <Button size="sm" variant="ghost" disabled>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Provider Types Grid */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                Available Platforms
            </h2>
            <div className="w-full md:w-1/3">
                 <SearchFilterBar
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Filter platforms..."
                />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviderTypes.map((type) => {
            const config = MESSAGE_PROVIDER_CONFIGS[type];
            const requiredFields = (config.fields || []).filter((f: any) => f.required);
            const optionalFields = (config.fields || []).filter((f: any) => !f.required);

            return (
              <Card key={type} className="bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-all h-full flex flex-col">
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl text-2xl">{config.icon}</div>
                      <div>
                        <h3 className="card-title text-lg">{config.displayName}</h3>
                        <Badge variant="neutral" size="sm" className="mt-1">
                            {type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 mb-4 flex-grow">
                    {config.description}
                  </p>

                  <div className="space-y-3 mb-6">
                      {/* Required Fields */}
                      <div>
                        <h4 className="text-xs font-bold uppercase opacity-50 mb-1">Required Config</h4>
                        <div className="flex flex-wrap gap-1">
                        {requiredFields.length > 0 ? requiredFields.map((field: any) => (
                            <Badge key={field.name} size="small" variant="neutral" style="outline">
                            {field.label}
                            </Badge>
                        )) : <span className="text-xs italic opacity-50">None</span>}
                        </div>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="card-actions justify-end mt-auto pt-4 border-t border-base-200">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddProvider(type)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Configure {config.displayName}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Configuration Guide */}
      <Card className="bg-base-200/50 border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuration Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-base-100 rounded-lg">
              <h3 className="font-bold mb-2 flex items-center gap-2">📱 Discord Setup</h3>
              <ul className="space-y-1 text-xs text-base-content/70 list-disc list-inside">
                <li>Create Discord Bot App</li>
                <li>Enable Message Intent</li>
                <li>Generate Bot Token</li>
                <li>Invite Bot to Server</li>
              </ul>
            </div>

            <div className="p-4 bg-base-100 rounded-lg">
              <h3 className="font-bold mb-2 flex items-center gap-2">✈️ Telegram Setup</h3>
              <ul className="space-y-1 text-xs text-base-content/70 list-disc list-inside">
                <li>Message @BotFather</li>
                <li>Create New Bot</li>
                <li>Get Bot Token</li>
                <li>Set Privacy Mode</li>
              </ul>
            </div>

            <div className="p-4 bg-base-100 rounded-lg">
              <h3 className="font-bold mb-2 flex items-center gap-2">💬 Slack Setup</h3>
              <ul className="space-y-1 text-xs text-base-content/70 list-disc list-inside">
                <li>Create Slack App</li>
                <li>Add Bot Scopes</li>
                <li>Install to Workspace</li>
                <li>Invite to Channels</li>
              </ul>
            </div>

            <div className="p-4 bg-base-100 rounded-lg">
              <h3 className="font-bold mb-2 flex items-center gap-2">🔗 Webhook Setup</h3>
              <ul className="space-y-1 text-xs text-base-content/70 list-disc list-inside">
                <li>Set Endpoint URL</li>
                <li>Configure Auth Header</li>
                <li>Define Payload Format</li>
                <li>Verify Signature</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Provider Configuration Modal */}
      <ProviderConfigModal
        modalState={{
          ...modalState,
          providerType: 'message',
        }}
        existingProviders={configuredProviders}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default MessageProvidersPage;
