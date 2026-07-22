import type { ProviderConfigSchema } from '../types';

/**
 * Webhook messenger schema for the WebUI registry.
 *
 * Outbound send performs a real HTTP POST (throws if WEBHOOK_URL is unset).
 * Marked beta — push-based messenger with no channel history.
 */
export const webhookProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'webhook',
  displayName: 'Webhook',
  description:
    'HTTP webhook messenger: outbound POST + inbound ingress (no channel history).',
  icon: '🔗',
  color: '#6B7280',
  maturity: 'beta',
  notes:
    'Requires WEBHOOK_URL (or per-bot webhook.url). Delivery throws on missing URL or non-2xx — never returns a silent fake message id.',
  defaultConfig: {
    enabled: true,
  },
  fields: [
    {
      name: 'url',
      label: 'Outbound URL',
      type: 'url',
      required: true,
      description: 'URL that receives outbound message POSTs',
      placeholder: 'https://example.com/hooks/hivemind',
      group: 'Connection',
    },
    {
      name: 'token',
      label: 'Bearer token',
      type: 'password',
      required: false,
      description: 'Optional Authorization bearer token for outbound deliveries',
      group: 'Authentication',
    },
    {
      name: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      required: false,
      description: 'Whether this webhook provider instance is active',
      defaultValue: true,
      group: 'Connection',
    },
  ],
};
