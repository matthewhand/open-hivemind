import convict, { Config } from 'convict';
import path from 'path';

// Define the schema interface
interface MessageConfigSchema {
  MESSAGE_PROVIDER: string;
  MESSAGE_MIN_INTERVAL_MS: number;
  MESSAGE_FOLLOW_UP_ENABLED: boolean;
  MESSAGE_IGNORE_BOTS: boolean;
  MESSAGE_LLM_CHAT: boolean;
  MESSAGE_LLM_COMPLETE_SENTENCE: boolean;
  MESSAGE_LLM_FOLLOW_UP: boolean;
  MESSAGE_LLM_SUMMARISE: boolean;
  MESSAGE_COMMAND_INLINE: boolean;
  MESSAGE_COMMAND_SLASH: boolean;
  MESSAGE_COMMAND_AUTHORISED_USERS: string;
  MESSAGE_WEBHOOK_ENABLED: boolean;
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: number;
  MESSAGE_ACTIVITY_TIME_WINDOW: number;
  MESSAGE_WAKEWORDS: string[];
  MESSAGE_INTERROBANG_BONUS: number;
  MESSAGE_MENTION_BONUS: number;
  MESSAGE_BOT_RESPONSE_MODIFIER: number;
  MESSAGE_FILTER_BY_USER: boolean;
  MESSAGE_HISTORY_LIMIT: number;
  MESSAGE_STRIP_BOT_ID: boolean;
  MESSAGE_ADD_USER_HINT: boolean;
}

// Create the convict schema
const messageConfig: Config<MessageConfigSchema> = convict<MessageConfigSchema>({
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
    default: 300000,
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
  },
  MESSAGE_HISTORY_LIMIT: {
    doc: 'Number of messages to fetch from the channel history.',
    format: 'int',
    default: 10,
    env: 'MESSAGE_HISTORY_LIMIT'
  },
  MESSAGE_STRIP_BOT_ID: {
    doc: 'Remove bot ID references from messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_STRIP_BOT_ID'
  },
  MESSAGE_ADD_USER_HINT: {
    doc: 'Add a user hint (e.g., "from <user>") in messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ADD_USER_HINT'
  }
});

// Load the configuration from JSON file
const configFilePath = path.join(__dirname, '../../../config/providers/message.json');
messageConfig.loadFile(configFilePath);

// Validate the configuration to ensure it matches the schema
messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
