import React, { useState } from 'react';
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
  const [globalProviders, setGlobalProviders] = useState<any[]>([]);

  const breadcrumbItems = [
    { label: 'Home', href: '/uber' },
    { label: 'Providers', href: '/uber/providers' },
    { label: 'Message Providers', href: '/uber/providers/message', isActive: true },
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
    openAddModal('global', 'message');
  };

  const handleProviderSubmit = (providerData: any) => {
    // For global provider management, we would store these globally
    closeModal();
  };

  const providerTypes = Object.keys(MESSAGE_PROVIDER_CONFIGS) as MessageProviderType[];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-4xl font-bold mb-2">Message Providers</h1>
        <p className="text-base-content/70">
          Configure messaging platforms for your bots to connect and communicate
        </p>
      </div>

      {/* Provider Types Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Provider Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providerTypes.map((type) => {
            const config = MESSAGE_PROVIDER_CONFIGS[type];
            return (
              <Card key={type} className="bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-shadow duration-200">
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{config.icon}</div>
                      <div>
                        <h3 className="card-title text-lg">{config.name}</h3>
                        <p className="text-sm text-base-content/60">{type}</p>
                      </div>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {config.requiredFields.length} required
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
                      {config.requiredFields.map((field) => (
                        <Badge key={field.key} color="neutral" variant="secondary" className="btn-outline" className="text-xs">
                          {field.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Optional Fields */}
                  {config.optionalFields.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-base-content/80 mb-2">Optional Fields</h4>
                      <div className="flex flex-wrap gap-1">
                        {config.optionalFields.map((field) => (
                          <Badge key={field.key} color="ghost" variant="secondary" className="btn-outline" className="text-xs">
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
                      Configure {config.name}
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
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default MessageProvidersPage;