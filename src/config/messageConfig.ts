import convict from 'convict';
import path from 'path';

// Custom format for SLACK_WORKSPACES array (optional)
convict.addFormat({
  name: 'slack-workspaces',
  validate: (val) => {
    if (!Array.isArray(val)) {
      throw new Error('SLACK_WORKSPACES must be an array');
    }
    val.forEach((ws, index) => {
      if (!ws.token || typeof ws.token !== 'string') {
        throw new Error(`Workspace ${index} must have a string 'token'`);
      }
      if (!ws.channels || !Array.isArray(ws.channels) || !ws.channels.every((ch: string) => typeof ch === 'string')) {
        throw new Error(`Workspace ${index} must have an array of string 'channels'`);
      }
    });
  },
  coerce: (val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        throw new Error('SLACK_WORKSPACES must be a valid JSON array or array');
      }
    }
    return val;
  }
});

const messageConfig = convict({
  MESSAGE_PROVIDER: { 
    doc: 'Comma-separated messaging platforms (e.g., slack,discord)', 
    format: String, 
    default: 'slack', 
    env: 'MESSAGE_PROVIDER',
    coerce: (val: string) => val.split(',').map((v: string) => v.trim())
  },
  MESSAGE_IGNORE_BOTS: { 
    doc: 'Ignore bot messages', 
    format: Boolean, 
    default: true, 
    env: 'MESSAGE_IGNORE_BOTS' 
  },
  MESSAGE_ADD_USER_HINT: { 
    doc: 'Add user hints', 
    format: Boolean, 
    default: true, 
    env: 'MESSAGE_ADD_USER_HINT' 
  },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: { 
    doc: 'Max messages/minute per channel', 
    format: 'int', 
    default: 5, 
    env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL' 
  },
  MESSAGE_MIN_DELAY: { 
    doc: 'Min response delay (ms)', 
    format: 'int', 
    default: 1000, 
    env: 'MESSAGE_MIN_DELAY' 
  },
  MESSAGE_MAX_DELAY: { 
    doc: 'Max response delay (ms)', 
    format: 'int', 
    default: 10000, 
    env: 'MESSAGE_MAX_DELAY' 
  },
  MESSAGE_ACTIVITY_TIME_WINDOW: { 
    doc: 'Silence window (ms)', 
    format: 'int', 
    default: 300000, 
    env: 'MESSAGE_ACTIVITY_TIME_WINDOW' 
  },
  MESSAGE_WAKEWORDS: { 
    doc: 'Wakewords (comma-separated)', 
    format: String, 
    default: '!help,!ping', 
    env: 'MESSAGE_WAKEWORDS' 
  },
  MESSAGE_ONLY_WHEN_SPOKEN_TO: { 
    doc: 'Only respond when addressed', 
    format: Boolean, 
    default: true, 
    env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO' 
  },
  MESSAGE_INTERACTIVE_FOLLOWUPS: { 
    doc: 'Send follow-ups after silence', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_INTERACTIVE_FOLLOWUPS' 
  },
  MESSAGE_UNSOLICITED_ADDRESSED: { 
    doc: 'Unsolicited responses in addressed channels', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_UNSOLICITED_ADDRESSED' 
  },
  MESSAGE_UNSOLICITED_UNADDRESSED: { 
    doc: 'Unsolicited responses in unaddressed channels', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_UNSOLICITED_UNADDRESSED' 
  },
  MESSAGE_RESPOND_IN_THREAD: { 
    doc: 'Respond in threads', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_RESPOND_IN_THREAD' 
  },
  MESSAGE_THREAD_RELATION_WINDOW: { 
    doc: 'Time window for related posts (ms)', 
    format: 'int', 
    default: 300000, 
    env: 'MESSAGE_THREAD_RELATION_WINDOW' 
  },
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: { 
    doc: 'Decay rate for recent activity chance', 
    format: Number, 
    default: 0.001, 
    env: 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE' 
  },
  OPENAI_API_KEY: { 
    doc: 'OpenAI API key', 
    format: String, 
    default: '', 
    env: 'OPENAI_API_KEY' 
  },
  OPENAI_TEMPERATURE: { 
    doc: 'Sampling temperature', 
    format: Number, 
    default: 0.7, 
    env: 'OPENAI_TEMPERATURE' 
  },
  OPENAI_MAX_TOKENS: { 
    doc: 'Max tokens for completion', 
    format: 'int', 
    default: 150, 
    env: 'OPENAI_MAX_TOKENS' 
  },
  OPENAI_FREQUENCY_PENALTY: { 
    doc: 'Frequency penalty', 
    format: Number, 
    default: 0.1, 
    env: 'OPENAI_FREQUENCY_PENALTY' 
  },
  OPENAI_PRESENCE_PENALTY: { 
    doc: 'Presence penalty', 
    format: Number, 
    default: 0.05, 
    env: 'OPENAI_PRESENCE_PENALTY' 
  },
  OPENAI_BASE_URL: { 
    doc: 'Base URL for OpenAI API', 
    format: String, 
    default: 'https://api.openai.com', 
    env: 'OPENAI_BASE_URL' 
  },
  OPENAI_TIMEOUT: { 
    doc: 'API request timeout (ms)', 
    format: 'int', 
    default: 10000, 
    env: 'OPENAI_TIMEOUT' 
  },
  OPENAI_ORGANIZATION: { 
    doc: 'OpenAI organization ID', 
    format: String, 
    default: '', 
    env: 'OPENAI_ORGANIZATION' 
  },
  OPENAI_MODEL: { 
    doc: 'Model to use', 
    format: String, 
    default: 'gpt-4o', 
    env: 'OPENAI_MODEL' 
  },
  OPENAI_STOP: { 
    doc: 'Stop sequences', 
    format: Array, 
    default: ['\n', '.', '?', '!'], 
    env: 'OPENAI_STOP' 
  },
  OPENAI_TOP_P: { 
    doc: 'Top-p sampling', 
    format: Number, 
    default: 0.9, 
    env: 'OPENAI_TOP_P' 
  },
  OPENAI_SYSTEM_PROMPT: { 
    doc: 'System prompt', 
    format: String, 
    default: 'Greetings, human...', 
    env: 'OPENAI_SYSTEM_PROMPT' 
  },
  OPENAI_RESPONSE_MAX_TOKENS: { 
    doc: 'Max tokens for response', 
    format: 'int', 
    default: 100, 
    env: 'OPENAI_RESPONSE_MAX_TOKENS' 
  },
  MESSAGE_MIN_INTERVAL_MS: { 
    doc: 'Minimum interval in ms for processing messages', 
    format: 'int', 
    default: 1000, 
    env: 'MESSAGE_MIN_INTERVAL_MS' 
  },
  BOT_ID: { 
    doc: 'Bot Identifier', 
    format: String, 
    default: 'BOT_ID', 
    env: 'BOT_ID' 
  },
  MESSAGE_COMMAND_INLINE: { 
    doc: 'Inline command flag', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_COMMAND_INLINE' 
  },
  MESSAGE_COMMAND_AUTHORISED_USERS: { 
    doc: 'Command authorised users', 
    format: String, 
    default: '', 
    env: 'MESSAGE_COMMAND_AUTHORISED_USERS' 
  },
  MESSAGE_LLM_FOLLOW_UP: { 
    doc: 'Follow-up flag for LLM', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_LLM_FOLLOW_UP' 
  },
  MESSAGE_WEBHOOK_ENABLED: { 
    doc: 'Enable webhook service', 
    format: Boolean, 
    default: false, 
    env: 'MESSAGE_WEBHOOK_ENABLED' 
  },
  SLACK_WORKSPACES: {
    doc: 'Array of Slack workspaces with bot tokens and channels (optional, falls back to SLACK_BOT_TOKEN)',
    format: 'slack-workspaces',
    default: [],
    env: 'SLACK_WORKSPACES'
  }
});

messageConfig.loadFile(path.join(__dirname, '../../config/default.json'));
messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
