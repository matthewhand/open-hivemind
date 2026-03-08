import convict from 'convict';
import Debug from 'debug';

const debug = Debug('app:lettaConfig');

/**
 * Configuration schema for Letta (MemGPT) integration.
 * Manages API URLs, authentication credentials, and agent settings.
 */
const lettaConfig = convict({
  apiUrl: {
    doc: 'The API URL for the Letta server',
    format: String,
    default: 'https://api.letta.com/v1',
    env: 'LETTA_API_URL',
  },
  apiKey: {
    doc: 'API key for authentication with Letta',
    format: String,
    default: '',
    env: 'LETTA_API_KEY',
    sensitive: true,
  },
  agentId: {
    doc: 'The default agent ID to use for conversations',
    format: String,
    default: '',
    env: 'LETTA_AGENT_ID',
  },
  timeout: {
    doc: 'Request timeout in milliseconds',
    format: Number,
    default: 30000,
    env: 'LETTA_TIMEOUT',
  },
});

/**
 * Validates the configuration on initialization. Throws an error if any setting is invalid.
 */
lettaConfig.validate({ allowed: 'strict' });
debug('LettaConfig initialized with values:', lettaConfig.getProperties());

/**
 * Exports the validated configuration instance.
 */
export default lettaConfig;
