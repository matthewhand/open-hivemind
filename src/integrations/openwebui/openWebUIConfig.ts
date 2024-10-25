import convict from 'convict';
import Debug from 'debug';

const debug = Debug('app:openWebUIConfig');

/**
 * Configuration schema for Open WebUI integration.
 * Manages API URLs, authentication credentials, and optional knowledge file settings.
 */
const openWebUIConfig = convict({
  apiUrl: {
    doc: 'The API URL for the Open WebUI server',
    format: String,  // Changed from url to String to prevent validation issues
    default: 'http://host.docker.internal:3000/api/',
    env: 'OPEN_WEBUI_API_URL',
  },
  username: {
    doc: 'Username for authentication with Open WebUI',
    format: String,
    default: '',
    env: 'OPEN_WEBUI_USERNAME',
  },
  password: {
    doc: 'Password for authentication with Open WebUI',
    format: String,
    default: '',
    env: 'OPEN_WEBUI_PASSWORD',
    sensitive: true,
  },
  knowledgeFile: {
    doc: 'Path to the knowledge file to upload (optional)',
    format: String,
    default: null,
    env: 'OPEN_WEBUI_KNOWLEDGE_FILE',
  },
});

/**
 * Validates the configuration on initialization. Throws an error if any setting is invalid.
 */
openWebUIConfig.validate({ allowed: 'strict' });
debug('OpenWebUIConfig initialized with values:', openWebUIConfig.getProperties());

/**
 * Exports the validated configuration instance.
 * This ensures consistent access to environment-specific settings across modules.
 */
export default openWebUIConfig;
