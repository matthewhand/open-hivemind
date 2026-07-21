/**
 * Webhook provider configuration schema (registry + env docs).
 *
 * Outgoing delivery performs a real HTTP POST (see WebhookService.sendMessageToChannel).
 * There is no channel history API (push-based messenger).
 */

export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: string;
  options?: string[];
}

export interface ProviderSchema {
  key: string;
  label: string;
  type: 'messenger';
  docsUrl?: string;
  maturity?: 'stable' | 'beta' | 'experimental';
  notes?: string;
  fields: {
    required: ProviderField[];
    optional: ProviderField[];
    advanced: ProviderField[];
  };
}

/** Registry/UI schema consumed by admin available-provider-types. */
export const schema: ProviderSchema = {
  key: 'webhook',
  label: 'Webhook',
  type: 'messenger',
  maturity: 'beta',
  notes:
    'Outbound messages POST JSON to WEBHOOK_URL (throws if unset — no fake ids). ' +
    'Inbound ingress via handleIncomingWebhook. No channel history (push-based).',
  fields: {
    required: [
      {
        name: 'WEBHOOK_URL',
        type: 'text',
        label: 'Outbound URL',
        description: 'URL that receives outbound message POSTs',
      },
    ],
    optional: [
      {
        name: 'WEBHOOK_TOKEN',
        type: 'password',
        label: 'Bearer token',
        description: 'Optional Authorization bearer token for outbound deliveries',
      },
      {
        name: 'WEBHOOK_ENABLED',
        type: 'boolean',
        label: 'Enabled',
        description: 'Whether this webhook provider instance is active',
        default: 'true',
      },
    ],
    advanced: [],
  },
};

/**
 * Convict-style env field docs (legacy consumers that read WEBHOOK_* keys).
 * Prefer `schema` for registry/UI.
 */
export const envSchema = {
  WEBHOOK_URL: {
    doc: 'The URL to send outgoing webhook notifications to',
    format: 'url',
    default: '',
    env: 'WEBHOOK_URL',
    sensitive: true,
  },
  WEBHOOK_TOKEN: {
    doc: 'Security token for outgoing/incoming webhook verification',
    format: 'String',
    default: '',
    env: 'WEBHOOK_TOKEN',
    sensitive: true,
  },
  WEBHOOK_ENABLED: {
    doc: 'Whether this webhook provider instance is active',
    format: 'Boolean',
    default: true,
    env: 'WEBHOOK_ENABLED',
  },
};
