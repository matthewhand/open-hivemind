import convict from 'convict';
import path from 'path';

const webhookConfig = convict({
  WEBHOOK_ENABLED: {
    doc: 'Whether to enable the webhook service',
    format: Boolean,
    default: false,
    env: 'WEBHOOK_ENABLED'
  },
  WEBHOOK_URL: {
    doc: 'Webhook URL for sending messages',
    format: String,
    default: '',
    env: 'WEBHOOK_URL'
  },
  WEBHOOK_TOKEN: {
    doc: 'Token used to verify incoming webhook requests',
    format: String,
    default: '',
    env: 'WEBHOOK_TOKEN'
  },
  WEBHOOK_IP_WHITELIST: {
    doc: 'Comma-separated list of IPs allowed to send webhook requests',
    format: String,
    default: '',
    env: 'WEBHOOK_IP_WHITELIST'
  },
  WEBHOOK_PORT: {
    doc: 'The port to run the webhook on',
    format: 'port',
    default: 80,
    env: 'WEBHOOK_PORT'
  }
});

webhookConfig.loadFile(path.join(__dirname, '../../config/providers/webhook.json'));
webhookConfig.validate({ allowed: 'strict' });

export default webhookConfig;
