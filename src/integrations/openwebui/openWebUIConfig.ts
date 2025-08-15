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
    format: String,
    default: 'http://host.docker.internal:3000/api/',
    env: 'OPEN_WEBUI_API_URL',
  },
  authHeader: {
    doc: 'Authorization header value to use when calling Open WebUI (e.g., "Bearer <token>")',
    format: String,
    default: 'Bearer ollama',
    env: 'OPEN_WEBUI_AUTH_HEADER',
    sensitive: true,
  },
  breakerFailureThreshold: {
    doc: 'Circuit breaker failure threshold before opening',
    format: 'int',
    default: 5,
    env: 'OPEN_WEBUI_BREAKER_FAILURE_THRESHOLD',
  },
  breakerResetTimeoutMs: {
    doc: 'Circuit breaker reset timeout (ms)',
    format: 'int',
    default: 10000,
    env: 'OPEN_WEBUI_BREAKER_RESET_TIMEOUT_MS',
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
    default: '',  // Default to an empty string to indicate no file
    env: 'OPEN_WEBUI_KNOWLEDGE_FILE',
  },
  model: {
    doc: 'The default model to use for completions',
    format: String,
    default: 'llama3.2',
    env: 'OPEN_WEBUI_MODEL',
  },
});

/**
 * Validates the configuration on initialization. Throws an error if any setting is invalid.
 */
openWebUIConfig.validate({ allowed: 'strict' });
const props = openWebUIConfig.getProperties();
// Redact sensitive header before logging
if (props && typeof props === 'object') {
  (props as any).authHeader = '********';
}
debug('OpenWebUIConfig initialized with values:', props);

/**
 * Exports the validated configuration instance.
 */
export default openWebUIConfig;
