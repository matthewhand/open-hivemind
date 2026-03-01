import convict from 'convict';
import path from 'path';
import Debug from 'debug';
import { RESPONSE_PROFILE_KEY_TYPES, RESPONSE_PROFILE_OVERRIDE_KEYS } from './responseProfiles';

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
  if (Number.isNaN(n)) {return 1.0;}
  if (n < 0) {return 0.0;}
  if (n > 2) {return 2.0;}
  return n;
}

function coercePriority(n: number): number {
  if (Number.isNaN(n)) {return 0;}
  const i = Math.trunc(n);
  return i < 0 ? 0 : i;
}

function parseCSVMap(input: string): [string, string][] {
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
    if (val == null) {return;} // allow undefined/null
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
    if (val == null) {return {};}
    if (typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (!k) {continue;}
        out[k] = clampBonus(Number(v));
      }
      return out;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      let entries: [string, string][] = [];
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
      } else {
        entries = parseCSVMap(s);
      }
      const out: Record<string, number> = {};
      for (const [k, vs] of entries) {
        if (!k) {continue;}
        const n = clampBonus(Number(vs));
        out[k] = n;
      }
      return out;
    }
    return {};
  },
});

convict.addFormat({
  name: 'channel-priorities',
  validate: (val: unknown) => {
    if (val == null) {return;}
    if (typeof val === 'string') {
      const s = val.trim();
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        for (const v of Object.values(obj)) {
          const n = Number(v);
          if (Number.isNaN(n)) {throw new Error('CHANNEL_PRIORITIES values must be numbers');}
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
    if (val == null) {return {};}
    if (typeof val === 'object' && !Array.isArray(val)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (!k) {continue;}
        out[k] = coercePriority(Number(v));
      }
      return out;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      let entries: [string, string][] = [];
      if (s.startsWith('{')) {
        const obj = strictParseJSON(s);
        entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
      } else {
        entries = parseCSVMap(s);
      }
      const out: Record<string, number> = {};
      for (const [k, vs] of entries) {
        if (!k) {continue;}
        const n = coercePriority(Number(vs));
        out[k] = n;
      }
      return out;
    }
    return {};
  },
});

const responseProfileKeySet = new Set(RESPONSE_PROFILE_OVERRIDE_KEYS);

function coerceResponseProfileValue(key: string, value: unknown): number | boolean | undefined {
  if (!responseProfileKeySet.has(key as any)) {return undefined;}
  const expectedType = RESPONSE_PROFILE_KEY_TYPES[key as keyof typeof RESPONSE_PROFILE_KEY_TYPES];

  if (expectedType === 'number') {
    if (typeof value === 'number') {return value;}
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  if (expectedType === 'boolean') {
    if (typeof value === 'boolean') {return value;}
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {return true;}
      if (normalized === 'false') {return false;}
    }
  }

  return undefined;
}

convict.addFormat({
  name: 'response-profiles',
  validate: (val: unknown) => {
    if (val == null) {return;}
    if (typeof val === 'string' && val.trim() === '') {return;}
    const parsed = typeof val === 'string' ? strictParseJSON(val.trim()) : val;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('MESSAGE_RESPONSE_PROFILES must be a JSON object');
    }

    for (const [profileName, profileValue] of Object.entries(parsed as Record<string, unknown>)) {
      if (!profileName) {
        throw new Error('MESSAGE_RESPONSE_PROFILES profile names must be non-empty strings');
      }
      if (typeof profileValue !== 'object' || profileValue === null || Array.isArray(profileValue)) {
        throw new Error(`Response profile "${profileName}" must be an object`);
      }
      for (const [key, value] of Object.entries(profileValue as Record<string, unknown>)) {
        if (!responseProfileKeySet.has(key as any)) {
          throw new Error(`Response profile "${profileName}" contains unknown key "${key}"`);
        }
        const coerced = coerceResponseProfileValue(key, value);
        if (coerced === undefined) {
          const expectedType = RESPONSE_PROFILE_KEY_TYPES[key as keyof typeof RESPONSE_PROFILE_KEY_TYPES];
          throw new Error(`Response profile "${profileName}" key "${key}" must be ${expectedType}`);
        }
      }
    }
  },
  coerce: (val: unknown) => {
    if (val == null) {return {};}
    if (typeof val === 'string' && val.trim() === '') {return {};}
    const parsed = typeof val === 'string' ? strictParseJSON(val.trim()) : val;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    const out: Record<string, Record<string, number | boolean>> = {};
    for (const [profileName, profileValue] of Object.entries(parsed as Record<string, unknown>)) {
      if (!profileName || typeof profileValue !== 'object' || profileValue === null || Array.isArray(profileValue)) {
        continue;
      }
      const profileOut: Record<string, number | boolean> = {};
      for (const [key, value] of Object.entries(profileValue as Record<string, unknown>)) {
        const coerced = coerceResponseProfileValue(key, value);
        if (coerced !== undefined) {
          profileOut[key] = coerced;
        }
      }
      out[profileName] = profileOut;
    }
    return out;
  },
});

// After convict parses env and files, perform a second-pass normalization that can warn
function normalizeChannelMaps(
  bonuses: Record<string, number>,
  priorities: Record<string, number>,
  knownChannels?: string[],
): { bonuses: Record<string, number>; priorities: Record<string, number> } {
  const outB: Record<string, number> = {};
  const outP: Record<string, number> = {};

  // Apply clamps/coercions defensively again (idempotent)
  for (const [k, v] of Object.entries(bonuses || {})) {
    if (!k) {continue;}
    outB[k] = clampBonus(Number(v));
    if (knownChannels && knownChannels.length > 0 && !knownChannels.includes(k)) {
      debug('Warning: CHANNEL_BONUSES includes unknown channel id "%s"', k);
    }
  }
  for (const [k, v] of Object.entries(priorities || {})) {
    if (!k) {continue;}
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
    env: 'MESSAGE_PROVIDER',
  },
  MESSAGE_IGNORE_BOTS: {
    doc: 'Whether to ignore messages from bots entirely',
    format: Boolean,
    default: false,
    env: 'MESSAGE_IGNORE_BOTS',
  },
  MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL: {
    doc: 'When responding to bots, limit responses to the default channel only (prevents spam in other channels)',
    format: Boolean,
    default: false,
    env: 'MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL',
  },
  MESSAGE_SEMANTIC_RELEVANCE_ENABLED: {
    doc: 'Enable semantic relevance check - uses 1-token LLM call to boost reply chance if message is on-topic',
    format: Boolean,
    default: true,
    env: 'MESSAGE_SEMANTIC_RELEVANCE_ENABLED',
  },
  MESSAGE_SEMANTIC_RELEVANCE_BONUS: {
    doc: 'Multiplier to apply when message is semantically relevant and bot has posted recently (default: 10x)',
    format: Number,
    default: 10,
    env: 'MESSAGE_SEMANTIC_RELEVANCE_BONUS',
  },
  MESSAGE_ALLOW_SELF_MENTION: {
    doc: 'Allow bot to @mention itself in responses (default: false, strips self-mentions)',
    format: Boolean,
    default: false,
    env: 'MESSAGE_ALLOW_SELF_MENTION',
  },
  MESSAGE_SUPPRESS_DUPLICATES: {
    doc: 'Suppress duplicate/repetitive bot responses (enabled by default)',
    format: Boolean,
    default: true,
    env: 'MESSAGE_SUPPRESS_DUPLICATES',
  },
  MESSAGE_DUPLICATE_WINDOW_MS: {
    doc: 'Time window in milliseconds to check for duplicate messages (default: 5 minutes)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_DUPLICATE_WINDOW_MS',
  },
  MESSAGE_DUPLICATE_HISTORY_SIZE: {
    doc: 'Number of recent messages to track for duplicate detection',
    format: 'int',
    default: 10,
    env: 'MESSAGE_DUPLICATE_HISTORY_SIZE',
  },
  MESSAGE_ADD_USER_HINT: {
    doc: 'Whether to add user hint to messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ADD_USER_HINT',
  },
  DISABLE_DELAYS: {
    doc: 'When true, skips all artificial delays (reading delay, post-inference typing simulation). Typing indicator still shows during actual LLM inference. Per-bot override: BOTS_{name}_DISABLE_DELAYS=true',
    format: Boolean,
    default: false,
    env: 'DISABLE_DELAYS',
  },
  MESSAGE_RATE_LIMIT_PER_CHANNEL: {
    doc: 'Rate limit per channel (messages per minute)',
    format: 'int',
    default: 5,
    env: 'MESSAGE_RATE_LIMIT_PER_CHANNEL',
  },
  MESSAGE_MIN_DELAY: {
    doc: 'Minimum delay between messages (ms)',
    format: 'int',
    default: 1000,
    env: 'MESSAGE_MIN_DELAY',
  },
  MESSAGE_READING_DELAY_BASE_MS: {
    doc: 'Base pre-typing/pre-inference "reading" delay (ms) before scaling',
    format: 'int',
    default: 200,
    env: 'MESSAGE_READING_DELAY_BASE_MS',
  },
  MESSAGE_READING_DELAY_PER_CHAR_MS: {
    doc: 'Per-character component for pre-typing/pre-inference "reading" delay (ms per char) before scaling',
    format: Number,
    default: 15,
    env: 'MESSAGE_READING_DELAY_PER_CHAR_MS',
  },
  MESSAGE_READING_DELAY_MIN_MS: {
    doc: 'Minimum pre-typing/pre-inference "reading" delay (ms) before scaling',
    format: 'int',
    default: 500,
    env: 'MESSAGE_READING_DELAY_MIN_MS',
  },
  MESSAGE_READING_DELAY_MAX_MS: {
    doc: 'Maximum pre-typing/pre-inference "reading" delay (ms) before scaling',
    format: 'int',
    default: 2000,
    env: 'MESSAGE_READING_DELAY_MAX_MS',
  },
  MESSAGE_MAX_DELAY: {
    doc: 'Maximum delay between messages (ms)',
    format: 'int',
    default: 10000,
    env: 'MESSAGE_MAX_DELAY',
  },
  MESSAGE_COMPOUNDING_DELAY_BASE_MS: {
    doc: 'Base delay per message for compounding delay (ms). New messages during pre-typing extend this delay.',
    format: 'int',
    default: 1500,
    env: 'MESSAGE_COMPOUNDING_DELAY_BASE_MS',
  },
  MESSAGE_SHORT_LENGTH_PENALTY: {
    doc: 'Penalty to apply to probability for very short messages (<10 chars) to discourage responding to "ok", "lol"',
    format: Number,
    default: 0.1,
    env: 'MESSAGE_SHORT_LENGTH_PENALTY',
  },

  MESSAGE_COMPOUNDING_DELAY_MAX_MS: {
    doc: 'Maximum compounding delay before responding (ms). Prevents infinite wait.',
    format: 'int',
    default: 15000,
    env: 'MESSAGE_COMPOUNDING_DELAY_MAX_MS',
  },
  MESSAGE_DELAY_MULTIPLIER: {
    doc: 'Multiplier applied to artificial delays (pre-inference, line delays, scheduler delays)',
    format: Number,
    default: 1,
    env: 'MESSAGE_DELAY_MULTIPLIER',
  },
  MESSAGE_RESPONSE_PROFILES: {
    doc: 'Named response profiles for per-bot engagement tuning. JSON map of profileName -> {MESSAGE_* overrides}.',
    format: 'response-profiles',
    default: {
      default: {},
      eager: {
        MESSAGE_DELAY_MULTIPLIER: 1.5,
        MESSAGE_UNSOLICITED_BASE_CHANCE: 0.05,
        MESSAGE_ONLY_WHEN_SPOKEN_TO: false,
      },
      cautious: {
        MESSAGE_DELAY_MULTIPLIER: 3.5,
        MESSAGE_UNSOLICITED_BASE_CHANCE: 0.005,
        MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
      },
    },
    env: 'MESSAGE_RESPONSE_PROFILES',
  },
  MESSAGE_UNSOLICITED_BASE_CHANCE: {
    doc: 'Base probability for replying when not explicitly addressed (only used when MESSAGE_ONLY_WHEN_SPOKEN_TO=false)',
    format: Number,
    default: 0.01,
    env: 'MESSAGE_UNSOLICITED_BASE_CHANCE',
  },
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS: {
    doc: 'Window for counting unique participants when the bot has been silent (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS',
  },
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE: {
    doc: 'Participant reference point (factor=reference/participants) when the bot has been silent',
    format: 'int',
    default: 2,
    env: 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE',
  },
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR: {
    doc: 'Minimum multiplier applied to silent-chance based on participant count',
    format: Number,
    default: 0.25,
    env: 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR',
  },
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR: {
    doc: 'Maximum multiplier applied to silent-chance based on participant count',
    format: Number,
    default: 3,
    env: 'MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR',
  },
  MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST: {
    doc: 'Max temperature boost applied when the bot is repeating the same words across recent responses',
    format: Number,
    default: 0.4,
    env: 'MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST',
  },
  MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY: {
    doc: 'Minimum number of recent bot messages required before repetition-based temperature boosting is applied',
    format: 'int',
    default: 3,
    env: 'MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY',
  },
  MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD: {
    doc: 'Doc-frequency ratio threshold (0-1) for a word to be considered overused (e.g., 0.6 means in >=60% of recent bot messages)',
    format: Number,
    default: 0.6,
    env: 'MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD',
  },
  MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ: {
    doc: 'Minimum number of distinct recent bot messages a word must appear in to be considered overused',
    format: 'int',
    default: 3,
    env: 'MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ',
  },
  MESSAGE_OTHERS_TYPING_WINDOW_MS: {
    doc: 'Window to consider other users as "currently typing" (ms)',
    format: 'int',
    default: 8000,
    env: 'MESSAGE_OTHERS_TYPING_WINDOW_MS',
  },
  MESSAGE_OTHERS_TYPING_MAX_WAIT_MS: {
    doc: 'Max additional wait before starting typing even if others keep typing (ms)',
    format: 'int',
    default: 5000,
    env: 'MESSAGE_OTHERS_TYPING_MAX_WAIT_MS',
  },
  MESSAGE_ACTIVITY_TIME_WINDOW: {
    doc: 'Time window to consider for activity (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_ACTIVITY_TIME_WINDOW',
  },
  MESSAGE_WAKEWORDS: {
    doc: 'Wakewords to trigger bot responses',
    format: Array,
    default: ['!help', '!ping'],
    env: 'MESSAGE_WAKEWORDS',
  },
  MESSAGE_ONLY_WHEN_SPOKEN_TO: {
    doc: 'Only respond when spoken to directly',
    format: Boolean,
    default: true,
    env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO',
  },
  MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: {
    doc: 'When MESSAGE_ONLY_WHEN_SPOKEN_TO=true, allow unaddressed replies if the bot has spoken in this channel within this window (ms); set 0 to disable',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS',
  },
  MESSAGE_INTERACTIVE_FOLLOWUPS: {
    doc: 'Allow interactive follow-up questions',
    format: Boolean,
    default: false,
    env: 'MESSAGE_INTERACTIVE_FOLLOWUPS',
  },
  MESSAGE_UNSOLICITED_ADDRESSED: {
    doc: 'Allow unsolicited addressed messages',
    format: Boolean,
    default: false,
    env: 'MESSAGE_UNSOLICITED_ADDRESSED',
  },
  MESSAGE_UNSOLICITED_UNADDRESSED: {
    doc: 'Allow unsolicited unaddressed messages',
    format: Boolean,
    default: false,
    env: 'MESSAGE_UNSOLICITED_UNADDRESSED',
  },
  MESSAGE_RESPOND_IN_THREAD: {
    doc: 'Respond in thread when possible',
    format: Boolean,
    default: false,
    env: 'MESSAGE_RESPOND_IN_THREAD',
  },
  MESSAGE_THREAD_RELATION_WINDOW: {
    doc: 'Time window to consider messages related to a thread (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_THREAD_RELATION_WINDOW',
  },
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: {
    doc: 'Decay rate for recent activity scoring',
    format: Number,
    default: 0.5,
    env: 'MESSAGE_RECENT_ACTIVITY_DECAY_RATE',
  },
  MESSAGE_INTERROBANG_BONUS: {
    doc: 'Bonus for messages ending with interrobang',
    format: Number,
    default: 0.4,
    env: 'MESSAGE_INTERROBANG_BONUS',
  },
  MESSAGE_BOT_RESPONSE_MODIFIER: {
    doc: 'Modifier for bot response probability',
    format: Number,
    default: -0.1,
    env: 'MESSAGE_BOT_RESPONSE_MODIFIER',
  },
  MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION: {
    doc: 'If true, send the message even if it fails coherence/nonsense checks after retries (prevents blocking on false positives)',
    format: Boolean,
    default: true,
    env: 'MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION',
  },
  MESSAGE_MAX_GENERATION_RETRIES: {
    doc: 'Maximum number of retries for bad generation / duplicates / nonsense',
    format: 'int',
    default: 3,
    env: 'MESSAGE_MAX_GENERATION_RETRIES',
  },
  MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: {
    doc: 'Allow replying to bot-authored messages even when not explicitly addressed (risk: bot loops); addressed replies still work regardless',
    format: Boolean,
    default: false,
    env: 'MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED',
  },
  MESSAGE_COMMAND_INLINE: {
    doc: 'Enable inline command processing',
    format: Boolean,
    default: true,
    env: 'MESSAGE_COMMAND_INLINE',
  },
  MESSAGE_COMMAND_AUTHORISED_USERS: {
    doc: 'Comma-separated list of authorised users for commands',
    format: String,
    default: '',
    env: 'MESSAGE_COMMAND_AUTHORISED_USERS',
  },
  MESSAGE_LLM_FOLLOW_UP: {
    doc: 'Enable LLM follow-up responses',
    format: Boolean,
    default: false,
    env: 'MESSAGE_LLM_FOLLOW_UP',
  },
  MESSAGE_FOLLOW_UP_ENABLED: {
    doc: 'Enable message follow-up functionality',
    format: Boolean,
    default: true,
    env: 'MESSAGE_FOLLOW_UP_ENABLED',
  },
  MESSAGE_LLM_CHAT: {
    doc: 'Enable LLM chat functionality',
    format: Boolean,
    default: true,
    env: 'MESSAGE_LLM_CHAT',
  },
  MESSAGE_LLM_COMPLETE_SENTENCE: {
    doc: 'Enable LLM sentence completion',
    format: Boolean,
    default: true,
    env: 'MESSAGE_LLM_COMPLETE_SENTENCE',
  },
  MESSAGE_LLM_SUMMARISE: {
    doc: 'Enable LLM summarization',
    format: Boolean,
    default: false,
    env: 'MESSAGE_LLM_SUMMARISE',
  },
  MESSAGE_COMMAND_SLASH: {
    doc: 'Enable slash command processing',
    format: Boolean,
    default: true,
    env: 'MESSAGE_COMMAND_SLASH',
  },
  MESSAGE_WEBHOOK_ENABLED: {
    doc: 'Enable webhook functionality',
    format: Boolean,
    default: true,
    env: 'MESSAGE_WEBHOOK_ENABLED',
  },
  MESSAGE_MENTION_BONUS: {
    doc: 'Bonus for mentions',
    format: Number,
    default: 0.1,
    env: 'MESSAGE_MENTION_BONUS',
  },
  MESSAGE_FILTER_BY_USER: {
    doc: 'Filter messages by user',
    format: String,
    default: '',
    env: 'MESSAGE_FILTER_BY_USER',
  },
  MESSAGE_HISTORY_LIMIT: {
    doc: 'Limit for message history',
    format: 'int',
    default: 30,
    env: 'MESSAGE_HISTORY_LIMIT',
  },
  MESSAGE_HISTORY_ADAPTIVE_ENABLED: {
    doc: 'Enable adaptive history fetch sizing (per-channel)',
    format: Boolean,
    default: true,
    env: 'MESSAGE_HISTORY_ADAPTIVE_ENABLED',
  },
  MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT: {
    doc: 'Minimum history fetch limit when adaptive sizing is enabled',
    format: 'int',
    default: 6,
    env: 'MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT',
  },
  MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT: {
    doc: 'Maximum history fetch limit when adaptive sizing is enabled',
    format: 'int',
    default: 60,
    env: 'MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT',
  },
  MESSAGE_HISTORY_ADAPTIVE_STEP: {
    doc: 'Step size for adaptive history fetch sizing',
    format: 'int',
    default: 5,
    env: 'MESSAGE_HISTORY_ADAPTIVE_STEP',
  },
  MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION: {
    doc: 'Target input token budget utilization for adaptive history sizing (0-1)',
    format: Number,
    default: 0.75,
    env: 'MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION',
  },
  MESSAGE_LLM_CONTEXT_WINDOW_TOKENS: {
    doc: 'Approximate model context window (input+output) used for token-budgeted history trimming',
    format: 'int',
    default: 8000,
    env: 'MESSAGE_LLM_CONTEXT_WINDOW_TOKENS',
  },
  MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS: {
    doc: 'Safety margin reserved from the context window for hidden/system overhead',
    format: 'int',
    default: 400,
    env: 'MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS',
  },
  MESSAGE_DECAY_RATE: {
    doc: 'Decay rate for message processing',
    format: Number,
    default: 0.001,
    env: 'MESSAGE_DECAY_RATE',
  },
  MESSAGE_CALM_WINDOW: {
    doc: 'Calm window for message processing (ms)',
    format: 'int',
    default: 300000,
    env: 'MESSAGE_CALM_WINDOW',
  },
  PLATFORM: {
    doc: 'Platform identifier',
    format: String,
    default: 'discord',
    env: 'PLATFORM',
  },
  NAME: {
    doc: 'Application name',
    format: String,
    default: 'Open-Hivemind',
    env: 'NAME',
  },
  BOT_ID: {
    doc: 'Bot identifier',
    format: String,
    default: 'slack-bot',
    env: 'BOT_ID',
  },
  MESSAGE_MIN_INTERVAL_MS: {
    doc: 'Minimum interval between messages (ms)',
    format: 'int',
    default: 3000,
    env: 'MESSAGE_MIN_INTERVAL_MS',
  },
  MESSAGE_STRIP_BOT_ID: {
    doc: 'Strip bot ID from messages',
    format: Boolean,
    default: true,
    env: 'MESSAGE_STRIP_BOT_ID',
  },
  MESSAGE_USERNAME_OVERRIDE: {
    doc: 'Override username for bot messages',
    format: String,
    default: 'Bot',
    env: 'MESSAGE_USERNAME_OVERRIDE',
  },

  // Channel routing
  MESSAGE_CHANNEL_ROUTER_ENABLED: {
    doc: 'Enable ChannelRouter-based outbound channel selection',
    format: Boolean,
    default: false,
    env: 'MESSAGE_CHANNEL_ROUTER_ENABLED',
  },
  CHANNEL_BONUSES: {
    doc: 'Channel bonuses map (CSV "id:bonus,..." or JSON object). Range [0.0,2.0]. Default 1.0 when missing.',
    format: 'channel-bonuses',
    default: {},
    env: 'CHANNEL_BONUSES',
  },
  CHANNEL_PRIORITIES: {
    doc: 'Channel priorities map (CSV "id:int,..." or JSON object). Integer, lower means higher priority. Default 0 when missing.',
    format: 'channel-priorities',
    default: {},
    env: 'CHANNEL_PRIORITIES',
  },
  greeting: {
    doc: 'Greeting message configuration',
    format: Object,
    default: {
      disabled: false,
      message: 'Hello! I am online.',
      use_llm: true,
    },
    env: 'GREETING',
  },
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
    let entries: [string, string][] = [];
    if (s.startsWith('{')) {
      const obj = strictParseJSON(s); // throws if malformed
      entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
    } else {
      entries = parseCSVMap(s);
    }
    const out: Record<string, number> = {};
    for (const [k, vs] of entries) {
      if (!k) {continue;}
      out[k] = clampBonus(Number(vs));
    }
    (messageConfig as any).set('CHANNEL_BONUSES', out);
  }

  if (typeof pEnv === 'string') {
    const s = pEnv.trim();
    let entries: [string, string][] = [];
    if (s.startsWith('{')) {
      const obj = strictParseJSON(s); // throws if malformed
      entries = Object.entries(obj).map(([k, v]) => [k, String(v)]);
    } else {
      entries = parseCSVMap(s);
    }
    const out: Record<string, number> = {};
    for (const [k, vs] of entries) {
      if (!k) {continue;}
      out[k] = coercePriority(Number(vs));
    }
    (messageConfig as any).set('CHANNEL_PRIORITIES', out);
  }
}

// Validate after attempting to load files so malformed env JSON has been handled above
messageConfig.validate({ allowed: 'warn' });

// Second-pass normalization with optional known channel list (none here; providers can supply later)
const normalized = normalizeChannelMaps(
  (messageConfig as any).get('CHANNEL_BONUSES'),
  (messageConfig as any).get('CHANNEL_PRIORITIES'),
  undefined,
);
// Overwrite normalized values back into config
(messageConfig as any).set('CHANNEL_BONUSES', normalized.bonuses);
(messageConfig as any).set('CHANNEL_PRIORITIES', normalized.priorities);

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
