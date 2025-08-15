import convict from 'convict';
import path from 'path';

const replicateConfig = convict({
  REPLICATE_API_TOKEN: {
    doc: 'Replicate API token',
    format: String,
    default: '',
    env: 'REPLICATE_API_TOKEN',
    sensitive: true,
    level: 'advanced',
    group: 'replicate'
  },
  REPLICATE_MODEL_VERSION: {
    doc: 'Replicate model version',
    format: String,
    default: 'default-model-version',
    env: 'REPLICATE_MODEL_VERSION',
    level: 'advanced',
    group: 'replicate'
  },
  REPLICATE_DEFAULT_PROMPT: {
    doc: 'Default prompt for image description',
    format: String,
    default: 'Please describe this image',
    env: 'REPLICATE_DEFAULT_PROMPT',
    level: 'advanced',
    group: 'replicate'
  },
  REPLICATE_WEBHOOK_URL: {
    doc: 'Webhook URL for Replicate prediction updates',
    format: String,
    default: '',
    env: 'REPLICATE_WEBHOOK_URL',
    level: 'advanced',
    group: 'replicate'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/replicate.json');

try {
  replicateConfig.loadFile(configPath);
  replicateConfig.validate({ allowed: 'warn' });
} catch {
  // use defaults
}

export default replicateConfig;

