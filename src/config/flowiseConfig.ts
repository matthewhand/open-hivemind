import convict from 'convict';
import path from 'path';

const flowiseConfig = convict({
  FLOWISE_API_ENDPOINT: {
    doc: 'API endpoint for Flowise',
    format: String,
    default: '',
    env: 'FLOWISE_API_ENDPOINT'
  },
  FLOWISE_API_KEY: {
    doc: 'API key for Flowise',
    format: String,
    default: '',
    env: 'FLOWISE_API_KEY'
  },
  FLOWISE_CONVERSATION_CHATFLOW_ID: {
    doc: 'Chatflow ID for conversation interactions',
    format: String,
    default: '',
    env: 'FLOWISE_CONVERSATION_CHATFLOW_ID'
  },
  FLOWISE_COMPLETION_CHATFLOW_ID: {
    doc: 'Chatflow ID for text completion tasks',
    format: String,
    default: '',
    env: 'FLOWISE_COMPLETION_CHATFLOW_ID'
  },
  FLOWISE_USE_REST: {
    doc: 'Flag to use REST client instead of SDK',
    format: Boolean,
    default: false,
    env: 'FLOWISE_USE_REST'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/flowise.json');

try {
  flowiseConfig.loadFile(configPath);
  flowiseConfig.validate({ allowed: 'strict' });
} catch {
  // Fallback to defaults if config file is missing or invalid
  console.warn(`Warning: Could not load flowise config from ${configPath}, using defaults`);
}

export default flowiseConfig;
