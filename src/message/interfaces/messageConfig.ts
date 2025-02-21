import convict from 'convict';
import path from 'path';

const messageConfig = convict({
  MESSAGE_PROVIDER: {
    doc: 'Messaging platform provider (e.g., slack, discord)',
    format: String,
    default: 'slack',
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
    doc: 'Ignore messages from bots',
    format: Boolean,
    default: true,
    env: 'MESSAGE_IGNORE_BOTS'
  },
  MESSAGE_LLM_CHAT: {
    doc: 'Enable LLM chat completion',
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
    doc: 'Enable LLM follow-up requests',
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
    doc: 'Comma-separated list of authorized user IDs for commands',
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
    doc: 'Decay rate for recent activity',
    format: Number,
    default: 0.5,
    env: 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE'
  },
  MESSAGE_ACTIVITY_TIME_WINDOW: {
    doc: 'Time window for recent activity (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_ACTIVITY_TIME_WINDOW'
  },
  MESSAGE_WAKEWORDS: {
    doc: 'Comma-separated list of wakewords',
    format: String,
    default: '!help,!ping',
    env: 'MESSAGE_WAKEWORDS'
  },
  MESSAGE_INTERROBANG_BONUS: {
    doc: 'Bonus chance for interrobang messages',
    format: Number,
    default: 0.4,
    env: 'MESSAGE_INTERROBANG_BONUS'
  },
  MESSAGE_MENTION_BONUS: {
    doc: 'Bonus chance for direct mentions',
    format: Number,
    default: 0.8,
    env: 'MESSAGE_MENTION_BONUS'
  },
  MESSAGE_BOT_RESPONSE_MODIFIER: {
    doc: 'Modifier for bot response chance',
    format: Number,
    default: 0.1,
    env: 'MESSAGE_BOT_RESPONSE_MODIFIER'
  },
  MESSAGE_FILTER_BY_USER: {
    doc: 'Filter chat history by triggering user',
    format: Boolean,
    default: true,
    env: 'MESSAGE_FILTER_BY_USER'
  },
  MESSAGE_HISTORY_LIMIT: {
    doc: 'Number of messages to fetch from history',
    format: 'int',
    default: 20,
    env: 'MESSAGE_HISTORY_LIMIT'
  },
  MESSAGE_STRIP_BOT_ID: {
    doc: 'Remove bot ID from messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_STRIP_BOT_ID'
  },
  MESSAGE_ADD_USER_HINT: {
    doc: 'Add user hint to messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ADD_USER_HINT'
  },
  MESSAGE_MAX_DELAY: {
    doc: 'Maximum delay before sending a message (ms)',
    format: 'int',
    default: 10000,
    env: 'MESSAGE_MAX_DELAY'
  },
  MESSAGE_MIN_DELAY: {
    doc: 'Minimum delay before sending a message (ms)',
    format: 'int',
    default: 1000,
    env: 'MESSAGE_MIN_DELAY'
  },
  MESSAGE_DECAY_RATE: {
    doc: 'Decay rate for message delays',
    format: Number,
    default: -0.5,
    env: 'MESSAGE_DECAY_RATE'
  },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: {
    doc: 'Max messages per channel per minute',
    format: 'int',
    default: 5,
    env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL'
  },
  MESSAGE_CALM_WINDOW: {
    doc: 'Time to wait for calm period before replying (ms)',
    format: 'int',
    default: 2000,
    env: 'MESSAGE_CALM_WINDOW'
  },
  PLATFORM: {
    doc: 'Platform the bot runs on',
    format: String,
    default: 'slack',
    env: 'PLATFORM'
  },
  BOT_ID: {
    doc: 'Bot identifier',
    format: String,
    default: 'slack-bot',
    env: 'BOT_ID'
  }
});

messageConfig.loadFile(path.join(__dirname, '../../../config/providers/message.json'));
messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
