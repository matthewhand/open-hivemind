import convict from 'convict';

const flowiseConfig = convict({
  FLOWISE_API_ENDPOINT: {
    doc: 'The base URL of the Flowise API',
    format: String,
    default: 'http://localhost:3002/api/v1',
    env: 'FLOWISE_API_ENDPOINT',
  },
  FLOWISE_API_KEY: {
    doc: 'The API key for authenticating with Flowise',
    format: String,
    default: '',
    env: 'FLOWISE_API_KEY',
  },
  FLOWISE_CONVERSATION_CHATFLOW_ID: {
    doc: 'The chatflow ID for conversation-based completions',
    format: String,
    default: '',
    env: 'FLOWISE_CONVERSATION_CHATFLOW_ID',
  },
  FLOWISE_COMPLETION_CHATFLOW_ID: {
    doc: 'The chatflow ID for completion-based completions',
    format: String,
    default: '',
    env: 'FLOWISE_COMPLETION_CHATFLOW_ID',
  },
  FLOWISE_ENABLE_FALLBACK: {
    doc: 'Enable fallback to the manual HTTP Flowise API integration',
    format: Boolean,
    default: false,
    env: 'FLOWISE_ENABLE_FALLBACK',
  },
});

export default flowiseConfig;
