import { ProviderConfigSchema } from '../types';

export const webhookProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'webhook',
  displayName: 'Webhook',
  description: 'Receive messages via HTTP webhook',
  icon: '🔗',
  color: '#6B7280',
  defaultConfig: {
    method: 'POST',
    contentType: 'application/json'
  },
  fields: [
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'url',
      required: true,
      description: 'URL that will receive webhook messages',
      placeholder: 'https://your-domain.com/api/webhook',
      group: 'Configuration'
    },
    {
      name: 'secret',
      label: 'Secret Key',
      type: 'password',
      required: false,
      description: 'Secret for validating webhook signatures',
      placeholder: 'your-webhook-secret',
      group: 'Security'
    },
    {
      name: 'method',
      label: 'HTTP Method',
      type: 'select',
      required: true,
      description: 'HTTP method for webhook requests',
      options: [
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' }
      ],
      defaultValue: 'POST',
      group: 'Configuration'
    },
    {
      name: 'contentType',
      label: 'Content Type',
      type: 'select',
      required: true,
      description: 'Expected content type of webhook requests',
      options: [
        { label: 'JSON', value: 'application/json' },
        { label: 'Form Data', value: 'application/x-www-form-urlencoded' },
        { label: 'Plain Text', value: 'text/plain' }
      ],
      defaultValue: 'application/json',
      group: 'Configuration'
    },
    {
      name: 'allowedIPs',
      label: 'Allowed IPs',
      type: 'text',
      required: false,
      description: 'Comma-separated list of IP addresses that can send webhooks (leave empty for all)',
      placeholder: '192.168.1.1, 10.0.0.1',
      group: 'Security'
    },
    {
      name: 'autoResponse',
      label: 'Auto Response',
      type: 'boolean',
      required: false,
      description: 'Automatically send 200 OK response to webhooks',
      defaultValue: true,
      group: 'Behavior'
    }
  ]
};