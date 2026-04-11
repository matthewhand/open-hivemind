/**
 * Webhook provider configuration schema.
 */
export const schema = {
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
