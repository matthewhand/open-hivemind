import convict from 'convict';
import path from 'path';

const messageConfig = convict({
  MESSAGE_PROVIDER: {
    doc: 'The messaging platform to use (discord, slack, etc.)',
    format: String,
    default: 'slack',
    env: 'MESSAGE_PROVIDER'
  },
  MESSAGE_IGNORE_BOTS: {
    doc: 'Whether to ignore messages from bots',
    format: Boolean,
    default: true,
    env: 'MESSAGE_IGNORE_BOTS'
  },
  MESSAGE_ADD_USER_HINT: {
    doc: 'Whether to add user hint to messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ADD_USER_HINT'
  },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: {
    doc: 'Rate limit per channel (messages per minute)',
    format: 'int',
    default: 5,
    env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL'
  },
  MESSAGE_MIN_DELAY: {
    doc: 'Minimum delay between messages (ms)',
    format: 'int',
    default: 1000,
    env: 'MESSAGE_MIN_DELAY'
  },
  MESSAGE_MAX_DELAY: {
    doc: 'Maximum delay between messages (ms)',
    format: 'int',
    default: 10000,
    env: 'MESSAGE_MAX_DELAY'
  },
  MESSAGE_ACTIVITY_TIME_WINDOW: {
    doc: 'Time window to consider for activity (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_ACTIVITY_TIME_WINDOW'
  },
  MESSAGE_WAKEWORDS: {
    doc: 'Wakewords to trigger bot responses',
    format: Array,
    default: ['!help', '!ping'],
    env: 'MESSAGE_WAKEWORDS'
  },
  MESSAGE_ONLY_WHEN_SPOKEN_TO: {
    doc: 'Only respond when spoken to directly',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO'
  },
  MESSAGE_INTERACTIVE_FOLLOWUPS: {
    doc: 'Allow interactive follow-up questions',
    format: Boolean,
    default: false,
    env: 'MESSAGE_INTERACTIVE_FOLLOWUPS'
  },
  MESSAGE_UNSOLICITED_ADDRESSED: {
    doc: 'Allow unsolicited addressed messages',
    format: Boolean,
    default: false,
    env: 'MESSAGE_UNSOLICITED_ADDRESSED'
  },
  MESSAGE_UNSOLICITED_UNADDRESSED: {
    doc: 'Allow unsolicited unaddressed messages',
    format: Boolean,
    default: false,
    env: 'MESSAGE_UNSOLICITED_UNADDRESSED'
  },
  MESSAGE_RESPOND_IN_THREAD: {
    doc: 'Respond in thread when possible',
    format: Boolean,
    default: false,
    env: 'MESSAGE_RESPOND_IN_THREAD'
  },
  MESSAGE_THREAD_RELATION_WINDOW: {
    doc: 'Time window to consider messages related to a thread (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_THREAD_RELATION_WINDOW'
  },
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: {
    doc: 'Decay rate for recent activity scoring',
    format: Number,
    default: 0.5,
    env: 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE'
  },
  MESSAGE_INTERROBANG_BONUS: {
    doc: 'Bonus for messages ending with interrobang',
    format: Number,
    default: 0.4,
    env: 'MESSAGE_INTERROBANG_BONUS'
  },
  MESSAGE_BOT_RESPONSE_MODIFIER: {
    doc: 'Modifier for bot response probability',
    format: Number,
    default: 0.1,
    env: 'MESSAGE_BOT_RESPONSE_MODIFIER'
  },
  MESSAGE_COMMAND_INLINE: {
    doc: 'Enable inline command processing',
    format: Boolean,
    default: true,
    env: 'MESSAGE_COMMAND_INLINE'
  },
  MESSAGE_COMMAND_AUTHORISED_USERS: {
    doc: 'Comma-separated list of authorised users for commands',
    format: String,
    default: '',
    env: 'MESSAGE_COMMAND_AUTHORISED_USERS'
  },
  MESSAGE_LLM_FOLLOW_UP: {
    doc: 'Enable LLM follow-up responses',
    format: Boolean,
    default: false,
    env: 'MESSAGE_LLM_FOLLOW_UP'
  },
  BOT_ID: {
    doc: 'Bot identifier',
    format: String,
    default: 'slack-bot',
    env: 'BOT_ID'
  },
  MESSAGE_MIN_INTERVAL_MS: {
    doc: 'Minimum interval between messages (ms)',
    format: 'int',
    default: 3000,
    env: 'MESSAGE_MIN_INTERVAL_MS'
  },
  MESSAGE_STRIP_BOT_ID: {
    doc: 'Strip bot ID from messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_STRIP_BOT_ID'
  },
  MESSAGE_USERNAME_OVERRIDE: {
    doc: 'Override username for bot messages',
    format: String,
    default: 'MadgwickAI',
    env: 'MESSAGE_USERNAME_OVERRIDE'
  }
});

// Determine config directory
const configDir = process.env.NODE_CONFIG_DIR || './config/';

// Load configuration from file
const configPath = path.join(configDir, 'providers/message.json');

try {
  messageConfig.loadFile(configPath);
  messageConfig.validate({ allowed: 'warn' });
} catch (error) {
  console.warn(`Warning: Could not load message config from ${configPath}, using defaults`);
  console.error('Error loading config:', error);
}

export default messageConfig;
