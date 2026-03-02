import type { ProviderConfigSchema } from '../types';

export const webhookProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'webhook',
  displayName: 'Webhook',
  description: 'Generic webhook integration',
  icon: '🔗',
  color: '#808080',
  defaultConfig: {},
  fields: [
    {
      name: 'url',
      label: 'Webhook URL',
      type: 'url',
      required: true,
      description: 'Webhook URL for receiving updates',
      placeholder: 'https://your-domain.com/api/webhook',
    },
    {
      name: 'secret',
      label: 'Secret',
      type: 'password',
      required: false,
      description: 'Secret for authenticating webhook requests',
      placeholder: 'Your webhook secret',
    }
  ],
};
