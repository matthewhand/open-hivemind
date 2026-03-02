import type { ProviderConfigSchema } from '../types';

export const webhookProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'webhook',
  displayName: 'Webhook',
  description: 'Generic webhook integration',
  icon: '🔗',
  color: '#888888',
  defaultConfig: {},
  fields: [
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'url',
      required: true,
      description: 'The URL to send webhook requests to',
      placeholder: 'https://your-domain.com/webhook',
      group: 'Connection',
    },
    {
      name: 'secret',
      label: 'Secret',
      type: 'password',
      required: false,
      description: 'Optional secret for webhook authentication',
      placeholder: 'your-secret-token',
      group: 'Authentication',
    },
  ],
};
