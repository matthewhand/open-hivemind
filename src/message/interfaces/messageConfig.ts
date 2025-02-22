import convict from 'convict';
import path from 'path';

const messageConfig = convict({
  MESSAGE_PROVIDER: { doc: 'Messaging platform', format: 'string', default: 'discord', env: 'MESSAGE_PROVIDER' },
  MESSAGE_IGNORE_BOTS: { doc: 'Ignore bot messages', format: 'boolean', default: true, env: 'MESSAGE_IGNORE_BOTS' },
  MESSAGE_ADD_USER_HINT: { doc: 'Add user hints', format: 'boolean', default: true, env: 'MESSAGE_ADD_USER_HINT' },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: { doc: 'Max messages/minute per channel', format: 'int', default: 5, env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL' },
  MESSAGE_MIN_DELAY: { doc: 'Min response delay (ms)', format: 'int', default: 1000, env: 'MESSAGE_MIN_DELAY' },
  MESSAGE_MAX_DELAY: { doc: 'Max response delay (ms)', format: 'int', default: 10000, env: 'MESSAGE_MAX_DELAY' },
  MESSAGE_ACTIVITY_TIME_WINDOW: { doc: 'Silence window (ms)', format: 'int', default: 300000, env: 'MESSAGE_ACTIVITY_TIME_WINDOW' },
  MESSAGE_WAKEWORDS: { doc: 'Wakewords (comma-separated)', format: 'string', default: '!help,!ping', env: 'MESSAGE_WAKEWORDS' },
  MESSAGE_ONLY_WHEN_SPOKEN_TO: { doc: 'Only respond when addressed', format: 'boolean', default: true, env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO' },
  MESSAGE_INTERACTIVE_FOLLOWUPS: { doc: 'Send follow-ups after silence', format: 'boolean', default: false, env: 'MESSAGE_INTERACTIVE_FOLLOWUPS' },
  MESSAGE_UNSOLICITED_ADDRESSED: { doc: 'Unsolicited responses in addressed channels', format: 'boolean', default: false, env: 'MESSAGE_UNSOLICITED_ADDRESSED' },
  MESSAGE_UNSOLICITED_UNADDRESSED: { doc: 'Unsolicited responses in unaddressed channels', format: 'boolean', default: false, env: 'MESSAGE_UNSOLICITED_UNADDRESSED' },
  MESSAGE_RESPOND_IN_THREAD: { doc: 'Respond in threads', format: 'boolean', default: false, env: 'MESSAGE_RESPOND_IN_THREAD' },
  MESSAGE_THREAD_RELATION_WINDOW: { doc: 'Time window for related posts (ms)', format: 'int', default: 300000, env: 'MESSAGE_THREAD_RELATION_WINDOW' },
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: { doc: 'Decay rate for recent activity chance', format: 'number', default: 0.001, env: 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE' },
  OPENAI_API_KEY: { doc: 'OpenAI API key', format: 'string', default: '', env: 'OPENAI_API_KEY' },
  OPENAI_TEMPERATURE: { doc: 'Sampling temperature', format: 'number', default: 0.7, env: 'OPENAI_TEMPERATURE' },
  OPENAI_MAX_TOKENS: { doc: 'Max tokens for completion', format: 'int', default: 150, env: 'OPENAI_MAX_TOKENS' },
  OPENAI_FREQUENCY_PENALTY: { doc: 'Frequency penalty', format: 'number', default: 0.1, env: 'OPENAI_FREQUENCY_PENALTY' },
  OPENAI_PRESENCE_PENALTY: { doc: 'Presence penalty', format: 'number', default: 0.05, env: 'OPENAI_PRESENCE_PENALTY' },
  OPENAI_BASE_URL: { doc: 'Base URL for OpenAI API', format: 'string', default: 'https://api.openai.com', env: 'OPENAI_BASE_URL' },
  OPENAI_TIMEOUT: { doc: 'API request timeout (ms)', format: 'int', default: 10000, env: 'OPENAI_TIMEOUT' },
  OPENAI_ORGANIZATION: { doc: 'OpenAI organization ID', format: 'string', default: '', env: 'OPENAI_ORGANIZATION' },
  OPENAI_MODEL: { doc: 'Model to use', format: 'string', default: 'gpt-4', env: 'OPENAI_MODEL' },
  OPENAI_STOP: { doc: 'Stop sequences', format: Array, default: ['\n', '.', '?', '!'], env: 'OPENAI_STOP' },
  OPENAI_TOP_P: { doc: 'Top-p sampling', format: 'number', default: 0.9, env: 'OPENAI_TOP_P' },
  OPENAI_SYSTEM_PROMPT: { doc: 'System prompt', format: 'string', default: 'Greetings, human...', env: 'OPENAI_SYSTEM_PROMPT' },
  OPENAI_RESPONSE_MAX_TOKENS: { doc: 'Max tokens for response', format: 'int', default: 100, env: 'OPENAI_RESPONSE_MAX_TOKENS' },
  BOT_ID: { doc: 'Bot Identifier', format: 'string', default: 'BOT_ID', env: 'BOT_ID' },
  MESSAGE_COMMAND_INLINE: { doc: 'Inline command flag', format: 'boolean', default: false, env: 'MESSAGE_COMMAND_INLINE' },
  MESSAGE_COMMAND_AUTHORISED_USERS: { doc: 'Command authorised users', format: 'string', default: '', env: 'MESSAGE_COMMAND_AUTHORISED_USERS' },
  MESSAGE_LLM_FOLLOW_UP: { doc: 'Follow-up flag for LLM', format: 'boolean', default: false, env: 'MESSAGE_LLM_FOLLOW_UP' }
});

messageConfig.loadFile(path.join(__dirname, '../../../config/default.json'));
messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
