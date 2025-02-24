import convict from 'convict';
import path from 'path';

const messageConfig = convict({
  MESSAGE_PROVIDER: {
    doc: 'Messaging platform (e.g., slack, discord)',
    format: String,
    default: 'slack',
    env: 'MESSAGE_PROVIDER'
  },
  MESSAGE_IGNORE_BOTS: {
    doc: 'Ignore messages from bots',
    format: Boolean,
    default: true,
    env: 'MESSAGE_IGNORE_BOTS'
  },
  MESSAGE_ADD_USER_HINT: {
    doc: 'Add user hints to messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ADD_USER_HINT'
  },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: {
    doc: 'Max messages per minute per channel',
    format: 'int',
    default: 5,
    env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL'
  },
  MESSAGE_MIN_DELAY: {
    doc: 'Minimum response delay (ms)',
    format: 'int',
    default: 1000,
    env: 'MESSAGE_MIN_DELAY'
  },
  MESSAGE_MAX_DELAY: {
    doc: 'Maximum response delay (ms)',
    format: 'int',
    default: 10000,
    env: 'MESSAGE_MAX_DELAY'
  },
  MESSAGE_ACTIVITY_TIME_WINDOW: {
    doc: 'Silence window for follow-ups (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_ACTIVITY_TIME_WINDOW'
  },
  MESSAGE_WAKEWORDS: {
    doc: 'Comma-separated wakewords',
    format: String,
    default: '!help,!ping',
    env: 'MESSAGE_WAKEWORDS'
  },
  MESSAGE_ONLY_WHEN_SPOKEN_TO: {
    doc: 'Only respond when directly addressed',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO'
  },
  MESSAGE_INTERACTIVE_FOLLOWUPS: {
    doc: 'Enable interactive follow-ups',
    format: Boolean,
    default: false,
    env: 'MESSAGE_INTERACTIVE_FOLLOWUPS'
  },
  MESSAGE_UNSOLICITED_ADDRESSED: {
    doc: 'Allow unsolicited responses in addressed channels',
    format: Boolean,
    default: false,
    env: 'MESSAGE_UNSOLICITED_ADDRESSED'
  },
  MESSAGE_UNSOLICITED_UNADDRESSED: {
    doc: 'Allow unsolicited responses in unaddressed channels',
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
    doc: 'Time window for thread relation (ms)',
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
  MESSAGE_INTERROBANG_BONUS: {
    doc: 'Bonus chance for messages ending in ! or ?',
    format: Number,
    default: 0.3,
    env: 'MESSAGE_INTERROBANG_BONUS'
  },
  MESSAGE_BOT_RESPONSE_MODIFIER: {
    doc: 'Modifier for responses to bot messages',
    format: Number,
    default: -1.0,
    env: 'MESSAGE_BOT_RESPONSE_MODIFIER'
  },
  MESSAGE_COMMAND_INLINE: {
    doc: 'Enable inline command processing',
    format: Boolean,
    default: false,
    env: 'MESSAGE_COMMAND_INLINE'
  },
  MESSAGE_COMMAND_AUTHORISED_USERS: {
    doc: 'Comma-separated list of authorized user IDs',
    format: String,
    default: '',
    env: 'MESSAGE_COMMAND_AUTHORISED_USERS'
  },
  MESSAGE_LLM_FOLLOW_UP: {
    doc: 'Enable LLM follow-up messages',
    format: Boolean,
    default: false,
    env: 'MESSAGE_LLM_FOLLOW_UP'
  },
  BOT_ID: {
    doc: 'Bot identifier',
    format: String,
    default: '',
    env: 'BOT_ID'
  },
  MESSAGE_MIN_INTERVAL_MS: {
    doc: 'Minimum interval between message processing (ms)',
    format: 'int',
    default: 1000,
    env: 'MESSAGE_MIN_INTERVAL_MS'
  },
  MESSAGE_STRIP_BOT_ID: {
    doc: 'Whether to strip bot ID from messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_STRIP_BOT_ID'
  },
  MESSAGE_USERNAME_OVERRIDE: {
    doc: 'Override username for the bot across all platforms',
    format: String,
    default: 'MadgwickAI',
    env: 'MESSAGE_USERNAME_OVERRIDE'
  }
});

messageConfig.validate({ allowed: 'strict' });

export default messageConfig;
