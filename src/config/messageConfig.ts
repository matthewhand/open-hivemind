import convict from 'convict';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:messageConfig');

// Custom formats for channel routing maps
convict.addFormat({
  name: 'channel-bonuses',
  validate: (val: unknown) => {
    if (val == null) return; // allow undefined/null
    if (typeof val === 'string') return; // CSV accepted, validate on coerce
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const v of Object.values(val as Record<string, unknown>)) {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0.0 || n > 2.0) {
          throw new Error('CHANNEL_BONUSES values must be numbers in range [0.0, 2.0]');
        }
      }
      return;
    }
    throw new Error('CHANNEL_BONUSES must be JSON object map or CSV string "chan:bonus,..."');
  },
  coerce: (val: unknown) => {
    if (val == null) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, number>;
    if (typeof val === 'string') {
      const out: Record<string, number> = {};
      const parts = val.split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const [k, vs] = p.split(':').map(s => s.trim());
        if (!k || vs == null) continue;
        const n = Number(vs);
        if (!Number.isNaN(n) && n >= 0.0 && n <= 2.0) {
          out[k] = n;
        }
      }
      return out;
    }
    return {};
  }
});

convict.addFormat({
  name: 'channel-priorities',
  validate: (val: unknown) => {
    if (val == null) return;
    if (typeof val === 'string') return; // CSV accepted, validate on coerce
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const v of Object.values(val as Record<string, unknown>)) {
        const n = Number(v);
        if (!Number.isInteger(n)) {
          throw new Error('CHANNEL_PRIORITIES values must be integers (lower is higher priority)');
        }
      }
      return;
    }
    throw new Error('CHANNEL_PRIORITIES must be JSON object map or CSV string "chan:priority,..."');
  },
  coerce: (val: unknown) => {
    if (val == null) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, number>;
    if (typeof val === 'string') {
      const out: Record<string, number> = {};
      const parts = val.split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const [k, vs] = p.split(':').map(s => s.trim());
        if (!k || vs == null) continue;
        const n = Number(vs);
        if (Number.isInteger(n)) out[k] = n;
      }
      return out;
    }
    return {};
  }
});

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
  },

  // New: channel routing
  MESSAGE_CHANNEL_ROUTER_ENABLED: {
    doc: 'Enable ChannelRouter-based outbound channel selection',
    format: Boolean,
    default: false,
    env: 'MESSAGE_CHANNEL_ROUTER_ENABLED'
  },
  CHANNEL_BONUSES: {
    doc: 'Channel bonuses map (CSV "id:bonus,..." or JSON object). Range [0.0,2.0]. Default 1.0 when missing.',
    format: 'channel-bonuses',
    default: {},
    env: 'CHANNEL_BONUSES'
  },
  CHANNEL_PRIORITIES: {
    doc: 'Channel priorities map (CSV "id:int,..." or JSON object). Integer, lower means higher priority. Default 0 when missing.',
    format: 'channel-priorities',
    default: {},
    env: 'CHANNEL_PRIORITIES'
  }
});

// Determine config directory
const configDir = process.env.NODE_CONFIG_DIR || './config/';

// Load configuration from file
const configPath = path.join(configDir, 'providers/message.json');

try {
  messageConfig.loadFile(configPath);
  messageConfig.validate({ allowed: 'warn' });
  debug('messageConfig loaded and validated from %s', configPath);
} catch (error: any) {
  // Use debug-style logging to avoid noisy console.* during tests
  debug(`Warning: Could not load message config from ${configPath}, using defaults`);
  debug('Error loading config: %s', error?.message || String(error));
}

export default messageConfig;
