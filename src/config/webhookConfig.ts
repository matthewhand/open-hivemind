import convict from 'convict';
import path from 'path';

const webhookConfig = convict({
  WEBHOOK_ENABLED: {
    doc: 'Whether to enable the webhook service',
    format: Boolean,
    default: false,
    env: 'WEBHOOK_ENABLED',
  },
  WEBHOOK_URL: {
    doc: 'Webhook URL for sending messages',
    format: String,
    default: '',
    env: 'WEBHOOK_URL',
  },
  WEBHOOK_TOKEN: {
    doc: 'Token used to verify incoming webhook requests',
    format: String,
    default: '',
    env: 'WEBHOOK_TOKEN',
  },
  WEBHOOK_IP_WHITELIST: {
    doc: 'Comma-separated list of IPs allowed to send webhook requests',
    format: String,
    default: '',
    env: 'WEBHOOK_IP_WHITELIST',
  },
  WEBHOOK_PORT: {
    doc: 'The port to run the webhook on',
    format: 'port',
    default: 80,
    env: 'WEBHOOK_PORT',
  },
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/webhook.json');

try {
  webhookConfig.loadFile(configPath);

} catch (error: any) {
  if (error.code === 'ENOENT') {
    console.warn(`Warning: Could not load webhookConfig from ${configPath}, file not found. Using defaults and env vars.`);
  } else {
    // Re-throw parsing errors
    throw error;
  }
}

// Validate configuration (fail fast if invalid)
webhookConfig.validate({ allowed: 'strict' });

export default webhookConfig;
