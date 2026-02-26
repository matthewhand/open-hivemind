/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useModal } from '../hooks/useModal';
import { useBotProviders } from '../hooks/useBotProviders';
import { Card, Button, Badge } from '../components/DaisyUI';
import {
  MessageCircle as MessageIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
} from 'lucide-react';
import { Breadcrumbs } from '../components/DaisyUI';
import type { MessageProviderType} from '../types/bot';
import { MESSAGE_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, closeModal } = useModal();
  const [configuredProviders, setConfiguredProviders] = useState<any[]>([]);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/config/message-profiles');
      if (response.ok) {
        const data = await response.json();
        setConfiguredProviders(data.profiles.message || []);
      }
    } catch (error) {
      console.error('Failed to fetch message profiles:', error);
    }
  };

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Providers', href: '/admin/providers' },
    { label: 'Message Platforms', href: '/admin/providers/message', isActive: true },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'connected':
      return <CheckIcon className="w-4 h-4 text-success" />;
    case 'error':
      return <XIcon className="w-4 h-4 text-error" />;
    case 'testing':
      return <WarningIcon className="w-4 h-4 text-warning" />;
    default:
      return <XIcon className="w-4 h-4 text-base-content/40" />;
    }
  };

  const handleAddProvider = (providerType: MessageProviderType) => {
    // We pass the provider type to the modal state if needed, but openAddModal
    // currently takes (context, type). We might need to adjust modal state handling
    // or just open it. The modal allows selecting type anyway.
    openAddModal('global', 'message');
  };

  const handleProviderSubmit = async (providerData: any) => {
    try {
      // Generate a key from name if not present (simple slug)
      const key = providerData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const payload = {
        key,
        name: providerData.name,
        provider: providerData.type, // Map 'type' to 'provider' for backend
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
        await fetchProviders(); // Refresh list
        closeModal();
      } else {
        const error = await response.json();
        console.error('Failed to create provider:', error);
        // Ideally show error to user
      }
    } catch (error) {
      console.error('Error submitting provider:', error);
    }
  };

  const providerTypes = Object.keys(MESSAGE_PROVIDER_CONFIGS) as MessageProviderType[];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-4xl font-bold mb-2">Message Platforms</h1>
        <p className="text-base-content/70">
          Configure messaging platforms for your bots to connect and communicate
        </p>
      </div>

      {/* Configured Providers */}
      {configuredProviders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Configured Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configuredProviders.map((provider) => {
              const config = MESSAGE_PROVIDER_CONFIGS[provider.provider as MessageProviderType] || MESSAGE_PROVIDER_CONFIGS.webhook;
              return (
                <Card key={provider.key} className="bg-base-100 shadow-lg border border-base-300">
                  <div className="card-body">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xl">{config.icon}</div>
                        <h3 className="card-title text-lg">{provider.name}</h3>
                      </div>
                      <Badge variant="success" size="sm">Configured</Badge>
                    </div>
                    <p className="text-sm text-base-content/60 mb-4">{provider.description || config.description}</p>
                    <div className="card-actions justify-end">
                      {/* Edit functionality to be implemented */}
                      <Button size="sm" variant="ghost" disabled>Edit</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Provider Types Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Provider Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providerTypes.map((type) => {
            const config = MESSAGE_PROVIDER_CONFIGS[type];
            const requiredFields = (config.fields || []).filter((f: any) => f.required);
            const optionalFields = (config.fields || []).filter((f: any) => !f.required);

            return (
              <Card key={type} className="bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-shadow duration-200">
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <h3 className="card-title text-lg">{config.displayName}</h3>
                        <p className="text-sm text-base-content/60">{type}</p>
                      </div>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {requiredFields.length} required
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 mb-4">
                    {config.description}
                  </p>

                  {/* Required Fields */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-base-content/80 mb-2">Required Fields</h4>
                    <div className="flex flex-wrap gap-1">
                      {requiredFields.map((field: any) => (
                        <Badge key={field.name} color="neutral" variant="secondary" className="btn-outline text-xs">
                          {field.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Optional Fields */}
                  {optionalFields.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-base-content/80 mb-2">Optional Fields</h4>
                      <div className="flex flex-wrap gap-1">
                        {optionalFields.map((field: any) => (
                          <Badge key={field.name} color="ghost" variant="secondary" className="btn-outline text-xs">
                            {field.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="card-actions justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAddProvider(type)}
                      className="w-full"
                    >
                      <AddIcon className="w-4 h-4 mr-2" />
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
      <Card className="bg-primary/5 border border-primary/20">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            <ConfigIcon className="w-6 h-6 mr-2" />
            Configuration Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-primary">📱 Discord Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Create a Discord Bot Application</li>
                <li>• Enable Message Content Intent</li>
                <li>• Generate Bot Token</li>
                <li>• Invite Bot to your Server</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-primary">✈️ Telegram Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Create a Bot with @BotFather</li>
                <li>• Get your Bot Token</li>
                <li>• Configure Webhook (optional)</li>
                <li>• Set up commands and permissions</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-primary">📱 Slack Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Create a Slack App</li>
                <li>• Enable Bot Token Scopes</li>
                <li>• Install App to Workspace</li>
                <li>• Add Bot to Channels</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-primary">🔗 Webhook Setup</h3>
              <ul className="space-y-2 text-sm text-base-content/70">
                <li>• Configure endpoint URL</li>
                <li>• Set up authentication</li>
                <li>• Define message format</li>
                <li>• Test webhook delivery</li>
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