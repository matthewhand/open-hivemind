import convict from 'convict';
import path from 'path';

const webhookConfig = convict({
  WEBHOOK_ENABLED: {
    doc: 'Enable webhook functionality',
    format: Boolean,
    default: false,
    env: 'WEBHOOK_ENABLED'
  },
  WEBHOOK_URL: {
    doc: 'Webhook URL for sending messages',
    format: String,
    default: '',
    env: 'WEBHOOK_URL'
  }
});

webhookConfig.loadFile(path.join(__dirname, '../../config/providers/webhook.json'));
webhookConfig.validate({ allowed: 'strict' });

export default webhookConfig;
