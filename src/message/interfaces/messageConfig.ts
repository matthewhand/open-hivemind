import convict from 'convict';
import path from 'path';

// Define the schema for message configuration
const messageConfig = convict({
  MESSAGE_PROVIDER: {
    doc: 'Message provider (e.g., discord)',
    format: String,
    default: 'discord',
    env: 'MESSAGE_PROVIDER'
  },
  MESSAGE_MIN_INTERVAL_MS: {
    doc: 'Minimum interval between messages (ms)',
    format: 'int',
    default: 3000,
    env: 'MESSAGE_MIN_INTERVAL_MS'
  },
  MESSAGE_FOLLOW_UP_ENABLED: {
    doc: 'Enable follow-up messages',
    format: Boolean,
    default: false,
    env: 'MESSAGE_FOLLOW_UP_ENABLED'
  },
  MESSAGE_IGNORE_BOTS: {
    doc: 'Enable ignore bots',
    format: Boolean,
    default: true,
    env: 'MESSAGE_IGNORE_BOTS'
  },
  MESSAGE_LLM_CHAT: {
    doc: 'Enable chat completion using LLM',
    format: Boolean,
    default: true,
    env: 'MESSAGE_LLM_CHAT'
  },
  MESSAGE_LLM_COMPLETE_SENTENCE: {
    doc: 'Enable LLM sentence completion',
    format: Boolean,
    default: true,
    env: 'MESSAGE_LLM_COMPLETE_SENTENCE'
  },
  MESSAGE_LLM_FOLLOW_UP: {
    doc: 'Enable follow-up requests for LLM responses',
    format: Boolean,
    default: false,
    env: 'MESSAGE_LLM_FOLLOW_UP'
  },
  MESSAGE_LLM_SUMMARISE: {
    doc: 'Enable LLM summarization',
    format: Boolean,
    default: true,
    env: 'MESSAGE_LLM_SUMMARISE'
  },
  MESSAGE_COMMAND_INLINE: {
    doc: 'Enable inline commands',
    format: Boolean,
    default: true,
    env: 'MESSAGE_COMMAND_INLINE'
  },
  MESSAGE_COMMAND_SLASH: {
    doc: 'Enable slash commands',
    format: Boolean,
    default: true,
    env: 'MESSAGE_COMMAND_SLASH'
  },
  MESSAGE_COMMAND_AUTHORISED_USERS: {
    doc: 'Authorized users for commands',
    format: String,
    default: '',
    env: 'MESSAGE_COMMAND_AUTHORISED_USERS'
  },
  MESSAGE_WEBHOOK_ENABLED: {
    doc: 'Enable webhook functionality',
    format: Boolean,
    default: false,
    env: 'MESSAGE_WEBHOOK_ENABLED'
  },
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: {
    doc: 'Decay rate for recent activity.',
    format: Number,
    default: 0.5,
    env: 'MESSAGE_DECAY_RATE'
  },
  MESSAGE_ACTIVITY_TIME_WINDOW: {
    doc: 'Time window for recent activity (in milliseconds).',
    format: Number,
    default: 300000, // 5 minutes
    env: 'MESSAGE_ACTIVITY_WINDOW'
  },
  MESSAGE_WAKEWORDS: {
    doc: 'List of wakewords to trigger responses.',
    format: Array,
    default: ['!help', '!ping']
  },
  MESSAGE_INTERROBANG_BONUS: {
    doc: 'Bonus chance for interrobang messages.',
    format: Number,
    default: 0.2
  },
  MESSAGE_MENTION_BONUS: {
    doc: 'Bonus chance for direct mentions.',
    format: Number,
    default: 0.8
  },
  MESSAGE_BOT_RESPONSE_MODIFIER: {
    doc: 'Modifier to reduce chance for bot responses.',
    format: Number,
    default: -1.0
  },
  MESSAGE_FILTER_BY_USER: {
    doc: 'If true, filter chat history to only include messages from the triggering user.',
    format: Boolean,
    default: true,
    env: 'MESSAGE_FILTER_BY_USER'
  }
});

// Load configuration from JSON file
const configFilePath = path.join(__dirname, '../../../config/providers/message.json');
messageConfig.loadFile(configFilePath);

// Validate the configuration to ensure it matches the schema
messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
