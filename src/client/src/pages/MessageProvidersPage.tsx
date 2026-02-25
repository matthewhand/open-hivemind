/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useModal } from '../hooks/useModal';
import { Card, Button, Badge, PageHeader, EmptyState } from '../components/DaisyUI';
import {
  MessageCircle as MessageIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { MessageProviderType} from '../types/bot';
import { MESSAGE_PROVIDER_CONFIGS } from '../types/bot';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';

const MessageProvidersPage: React.FC = () => {
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();
  const [configuredProviders, setConfiguredProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/message-profiles');
      if (response.ok) {
        const data = await response.json();
        setConfiguredProviders(data.profiles?.message || []);
      }
    } catch (error) {
      console.error('Failed to fetch message profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = (providerType: MessageProviderType) => {
    openAddModal('global', 'message');
  };

  const handleEditProvider = (provider: any) => {
    openEditModal('global', 'message', {
      id: provider.key,
      name: provider.name,
      type: provider.provider,
      config: provider.config,
      enabled: true,
    } as any);
  };

  const handleDeleteProvider = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete profile "${key}"?`)) return;

    try {
      const response = await fetch(`/api/config/message-profiles/${key}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchProviders();
      } else {
        const error = await response.json();
        alert(`Failed to delete provider: ${error.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Failed to delete provider: ${err.message}`);
    }
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

      if (modalState.isEdit && modalState.provider?.id) {
        const oldKey = modalState.provider.id;

        if (oldKey === key) {
           // Same key, simple update
           const response = await fetch(`/api/config/message-profiles/${oldKey}`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload),
           });
           if (!response.ok) throw new Error('Failed to update provider');
        } else {
           // Key change: create new then delete old to prevent data loss
           const createResponse = await fetch('/api/config/message-profiles', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(payload),
           });

           if (!createResponse.ok) {
             const error = await createResponse.json();
             throw new Error(error.message || 'Failed to create new provider during rename');
           }

           // Only delete old if creation succeeded
           const deleteResponse = await fetch(`/api/config/message-profiles/${oldKey}`, { method: 'DELETE' });
           if (!deleteResponse.ok) {
             console.error('Failed to delete old provider after rename');
             // Consider informing user, but operation was mostly successful (duplicate exists now)
           }
        }
      } else {
        // Create new
        const response = await fetch('/api/config/message-profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create provider');
        }
      }

      await fetchProviders(); // Refresh list
      closeModal();
    } catch (error: any) {
      console.error('Error submitting provider:', error);
      alert(error.message || 'An error occurred');
    }
  };

  const providerTypes = Object.keys(MESSAGE_PROVIDER_CONFIGS) as MessageProviderType[];

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Message Platforms"
        description="Configure messaging platforms for your bots to connect and communicate"
        icon={MessageIcon}
        actions={
          <Button variant="ghost" size="sm" onClick={fetchProviders} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {/* Configured Providers */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Configured Platforms</h2>
        {loading ? (
           <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg"></span></div>
        ) : configuredProviders.length > 0 ? (
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
                    <p className="text-sm text-base-content/60 mb-4 h-10 line-clamp-2">{provider.description || config.description}</p>
                    <div className="card-actions justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEditProvider(provider)}>
                        <Edit2 className="w-4 h-4" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-error" onClick={() => handleDeleteProvider(provider.key)}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={MessageIcon}
            title="No Platforms Configured"
            description="Select a provider below to start configuring your first messaging platform."
            variant="noData"
          />
        )}
      </div>

      <div className="divider">Available Providers</div>

      {/* Provider Types Grid */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providerTypes.map((type) => {
            const config = MESSAGE_PROVIDER_CONFIGS[type];
            const requiredFields = (config.fields || []).filter((f: any) => f.required);

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
                  </div>

                  {/* Description */}
                  <p className="text-sm text-base-content/70 mb-4 h-12 line-clamp-2">
                    {config.description}
                  </p>

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
      <Card className="bg-primary/5 border border-primary/20 mt-8">
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
