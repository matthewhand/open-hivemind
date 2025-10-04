import convict from 'convict';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:messageConfig');

// Utility: safe JSON parse with strict error throwing
function strictParseJSON(input: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error('Expected JSON object');
  } catch (e: any) {
    // strict: rethrow to surface malformed JSON
    throw new Error(`Invalid JSON: ${e?.message || String(e)}`);
  }
}

// Normalization helpers
function clampBonus(n: number): number {
  if (Number.isNaN(n)) return 1.0;
  if (n < 0) return 0.0;
  if (n > 2) return 2.0;
  return n;
}

function coercePriority(n: number): number {
  if (Number.isNaN(n)) return 0;
  const i = Math.trunc(n);
  return i < 0 ? 0 : i;
}

function parseCSVMap(input: string): Array<[string, string]> {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => {
      const [k, v] = p.split(':').map(s => s.trim());
      return [k || '', v ?? ''] as [string, string];
    });
}

// Custom formats for channel routing maps (with clamping/coercion and strict JSON)
convict.addFormat({
  name: 'channel-bonuses',
  validate: (val: unknown) => {
    if (val == null) return; // allow undefined/null
    if (typeof val === 'string') {
      // If looks like JSON object, validate JSON strictly here to surface errors early
      const s = val.trim();
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        for (const v of Object.values(obj)) {
          const n = Number(v);
          if (Number.isNaN(n)) {
            throw new Error('CHANNEL_BONUSES values must be numbers');
          }
          if (n < 0.0 || n > 2.0) {
            // allow out-of-range here; we will clamp on coerce, but still validate number-type
            continue;
          }
        }
      }
      return; // CSV accepted, validated on coerce
    }
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const v of Object.values(val as Record<string, unknown>)) {
        const n = Number(v);
        if (Number.isNaN(n)) {
          throw new Error('CHANNEL_BONUSES values must be numbers');
        }
        // Range will be normalized on coerce; accept number type here
      }
      return;
    }
    throw new Error('CHANNEL_BONUSES must be JSON object map or CSV string "chan:bonus,..."');
  },
  coerce: (val: unknown) => {
    if (val == null) return {};
    if (typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (!k) continue;
        out[k] = clampBonus(Number(v));
      }
      return out;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      let entries: Array<[string, string]> = [];
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
      } else {
        entries = parseCSVMap(s);
      }
      const out: Record<string, number> = {};
      for (const [k, vs] of entries) {
        if (!k) continue;
        const n = clampBonus(Number(vs));
        out[k] = n;
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
    if (typeof val === 'string') {
      const s = val.trim();
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        for (const v of Object.values(obj)) {
          const n = Number(v);
          if (Number.isNaN(n)) throw new Error('CHANNEL_PRIORITIES values must be numbers');
        }
      }
      return; // CSV accepted; detailed checks on coerce
    }
    if (typeof val === 'object' && !Array.isArray(val)) {
      for (const v of Object.values(val as Record<string, unknown>)) {
        const n = Number(v);
        if (Number.isNaN(n)) {
          throw new Error('CHANNEL_PRIORITIES values must be numbers');
        }
      }
      return;
    }
    throw new Error('CHANNEL_PRIORITIES must be JSON object map or CSV string "chan:priority,..."');
  },
  coerce: (val: unknown) => {
    if (val == null) return {};
    if (typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (!k) continue;
        out[k] = coercePriority(Number(v));
      }
      return out;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      let entries: Array<[string, string]> = [];
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
      } else {
        entries = parseCSVMap(s);
      }
      const out: Record<string, number> = {};
      for (const [k, vs] of entries) {
        if (!k) continue;
        const n = coercePriority(Number(vs));
        out[k] = n;
      }
      return out;
    }
    return {};
  }
});

// After convict parses env and files, perform a second-pass normalization that can warn
function normalizeChannelMaps(
  bonuses: Record<string, number>,
  priorities: Record<string, number>,
  knownChannels?: string[]
): { bonuses: Record<string, number>; priorities: Record<string, number> } {
  const outB: Record<string, number> = {};
  const outP: Record<string, number> = {};

  // Apply clamps/coercions defensively again (idempotent)
  for (const [k, v] of Object.entries(bonuses || {})) {
    if (!k) continue;
    outB[k] = clampBonus(Number(v));
    if (knownChannels && knownChannels.length > 0 && !knownChannels.includes(k)) {
      debug('Warning: CHANNEL_BONUSES includes unknown channel id "%s"', k);
    }
  }
  for (const [k, v] of Object.entries(priorities || {})) {
    if (!k) continue;
    outP[k] = coercePriority(Number(v));
    if (knownChannels && knownChannels.length > 0 && !knownChannels.includes(k)) {
      debug('Warning: CHANNEL_PRIORITIES includes unknown channel id "%s"', k);
    }
  }
  return { bonuses: outB, priorities: outP };
}

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
  MESSAGE_FOLLOW_UP_ENABLED: {
    doc: 'Enable message follow-up functionality',
    format: Boolean,
    default: true,
    env: 'MESSAGE_FOLLOW_UP_ENABLED'
  },
  MESSAGE_LLM_CHAT: {
    doc: 'Enable LLM chat functionality',
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
  MESSAGE_LLM_SUMMARISE: {
    doc: 'Enable LLM summarization',
    format: Boolean,
    default: false,
    env: 'MESSAGE_LLM_SUMMARISE'
  },
  MESSAGE_COMMAND_SLASH: {
    doc: 'Enable slash command processing',
    format: Boolean,
    default: true,
    env: 'MESSAGE_COMMAND_SLASH'
  },
  MESSAGE_WEBHOOK_ENABLED: {
    doc: 'Enable webhook functionality',
    format: Boolean,
    default: true,
    env: 'MESSAGE_WEBHOOK_ENABLED'
  },
  MESSAGE_MENTION_BONUS: {
    doc: 'Bonus for mentions',
    format: Number,
    default: 0.1,
    env: 'MESSAGE_MENTION_BONUS'
  },
  MESSAGE_FILTER_BY_USER: {
    doc: 'Filter messages by user',
    format: String,
    default: '',
    env: 'MESSAGE_FILTER_BY_USER'
  },
  MESSAGE_HISTORY_LIMIT: {
    doc: 'Limit for message history',
    format: 'int',
    default: 10,
    env: 'MESSAGE_HISTORY_LIMIT'
  },
  MESSAGE_DECAY_RATE: {
    doc: 'Decay rate for message processing',
    format: Number,
    default: 0.001,
    env: 'MESSAGE_DECAY_RATE'
  },
  MESSAGE_CALM_WINDOW: {
    doc: 'Calm window for message processing (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_CALM_WINDOW'
  },
  PLATFORM: {
    doc: 'Platform identifier',
    format: String,
    default: 'discord',
    env: 'PLATFORM'
  },
  NAME: {
    doc: 'Application name',
    format: String,
    default: 'Open-Hivemind',
    env: 'NAME'
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

  // Channel routing
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
} catch (error: any) {
  // Use debug-style logging to avoid noisy console.* during tests
  debug(`Warning: Could not load message config from ${configPath}, using defaults`);
  debug('Error loading config: %s', error?.message || String(error));
}

// Apply env overrides with strict parsing and normalization, so malformed JSON throws here
if (typeof process !== 'undefined' && process.env) {
  const bEnv = process.env.CHANNEL_BONUSES;
  const pEnv = process.env.CHANNEL_PRIORITIES;
  debug('env CHANNEL_BONUSES=%s', bEnv);
  debug('env CHANNEL_PRIORITIES=%s', pEnv);

  if (typeof bEnv === 'string') {
    const s = bEnv.trim();
    let entries: Array<[string, string]> = [];
    if (s.startsWith('{')) {
      const obj = strictParseJSON(s); // throws if malformed
      entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
    } else {
      entries = parseCSVMap(s);
    }
    const out: Record<string, number> = {};
    for (const [k, vs] of entries) {
      if (!k) continue;
      out[k] = clampBonus(Number(vs));
    }
    (messageConfig as any).set('CHANNEL_BONUSES', out);
  }

  if (typeof pEnv === 'string') {
    const s = pEnv.trim();
    let entries: Array<[string, string]> = [];
    if (s.startsWith('{')) {
      const obj = strictParseJSON(s); // throws if malformed
      entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
    } else {
      entries = parseCSVMap(s);
    }
    const out: Record<string, number> = {};
    for (const [k, vs] of entries) {
      if (!k) continue;
      out[k] = coercePriority(Number(vs));
    }
    (messageConfig as any).set('CHANNEL_PRIORITIES', out);
  }
}

// Validate after attempting to load files so malformed env JSON has been handled above
messageConfig.validate({ allowed: 'warn' });

// Second-pass normalization with optional known channel list (none here; providers can supply later)
// Temporary debug logging; respects ALLOW_CONSOLE in tests
if (process.env.ALLOW_CONSOLE) {
  console.log('pre-normalize get(CHANNEL_BONUSES)=', (messageConfig as any).get('CHANNEL_BONUSES'));
  console.log('pre-normalize get(CHANNEL_PRIORITIES)=', (messageConfig as any).get('CHANNEL_PRIORITIES'));
  const propsPre = (messageConfig as any).getProperties?.();
  console.log('pre-normalize props keys=', propsPre ? Object.keys(propsPre) : 'no-props');
}
const normalized = normalizeChannelMaps(
  (messageConfig as any).get('CHANNEL_BONUSES'),
  (messageConfig as any).get('CHANNEL_PRIORITIES'),
  undefined
);
// Overwrite normalized values back into config
(messageConfig as any).set('CHANNEL_BONUSES', normalized.bonuses);
(messageConfig as any).set('CHANNEL_PRIORITIES', normalized.priorities);
if (process.env.ALLOW_CONSOLE) {
  console.log('post-normalize get(CHANNEL_BONUSES)=', (messageConfig as any).get('CHANNEL_BONUSES'));
  console.log('post-normalize get(CHANNEL_PRIORITIES)=', (messageConfig as any).get('CHANNEL_PRIORITIES'));
}

debug('messageConfig loaded, validated, and normalized from %s', configPath);

// Ensure get() never returns undefined for channel maps, and prefer fully-coerced properties
const _origGet = (messageConfig as any).get?.bind(messageConfig);
const _getProps = (messageConfig as any).getProperties?.bind(messageConfig);
if (_origGet) {
  (messageConfig as any).get = (key: string) => {
    if (key === 'CHANNEL_BONUSES' || key === 'CHANNEL_PRIORITIES') {
      const props = _getProps ? _getProps() : undefined;
      const val = props ? (props as any)[key] : _origGet(key);
      return val ?? {};
    }
    return _origGet(key);
  };
}

export default messageConfig;
