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
    format: (val: any) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        if (val === '' || val === 'false' || val === 'FALSE' || val === '0' || val === 'no' || val === 'NO') return false;
        return true;
      }
      return Boolean(val);
    },
    default: true,
    env: 'FLOWISE_USE_REST'
  }
});

const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
const configPath = path.join(configDir, 'providers/flowise.json');

// Skip loading config file in test environment to allow environment variables to take precedence
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  try {
    flowiseConfig.loadFile(configPath);
    flowiseConfig.validate({ allowed: 'strict' });
  } catch {
    // Fallback to defaults if config file is missing or invalid
    console.warn(`Warning: Could not load flowise config from ${configPath}, using defaults`);
  }
}

const originalGet = flowiseConfig.get.bind(flowiseConfig);
flowiseConfig.get = (key: any) => {
  if (!key || typeof key !== 'string') {
    return undefined;
  }
  try {
    return originalGet(key);
  } catch (error) {
    return undefined;
  }
};

export default flowiseConfig;
