import { z } from 'zod';

/**
 * Message configuration schema
 */
export const MessageSchema = z.object({
  MESSAGE_PROVIDER: z.string().default('slack'),
  MESSAGE_IGNORE_BOTS: z.boolean().default(false),
  MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL: z.boolean().default(false),
  MESSAGE_SEMANTIC_RELEVANCE_ENABLED: z.boolean().default(true),
  MESSAGE_SEMANTIC_RELEVANCE_BONUS: z.number().default(10),
  MESSAGE_ALLOW_SELF_MENTION: z.boolean().default(false),
  MESSAGE_SUPPRESS_DUPLICATES: z.boolean().default(true),
  MESSAGE_DUPLICATE_WINDOW_MS: z.number().int().default(300000),
  MESSAGE_DUPLICATE_HISTORY_SIZE: z.number().int().default(10),
  MESSAGE_ADD_USER_HINT: z.boolean().default(true),
  DISABLE_DELAYS: z.boolean().default(false),
  MESSAGE_RATE_LIMIT_PER_CHANNEL: z.number().int().default(5),
  MESSAGE_MIN_DELAY: z.number().int().default(1000),
  MESSAGE_READING_DELAY_BASE_MS: z.number().int().default(200),
  MESSAGE_READING_DELAY_PER_CHAR_MS: z.number().default(15),
  MESSAGE_READING_DELAY_MIN_MS: z.number().int().default(500),
  MESSAGE_READING_DELAY_MAX_MS: z.number().int().default(2000),
  MESSAGE_MAX_DELAY: z.number().int().default(10000),
  MESSAGE_COMPOUNDING_DELAY_BASE_MS: z.number().int().default(1500),
  MESSAGE_SHORT_LENGTH_PENALTY: z.number().default(0.1),
  MESSAGE_COMPOUNDING_DELAY_MAX_MS: z.number().int().default(15000),
  MESSAGE_DELAY_MULTIPLIER: z.number().default(1),
  MESSAGE_UNSOLICITED_BASE_CHANCE: z.number().default(0.01),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS: z.number().int().default(300000),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE: z.number().int().default(2),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR: z.number().default(0.25),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR: z.number().default(3),
  MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST: z.number().default(0.4),
  MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY: z.number().int().default(3),
  MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD: z.number().default(0.6),
  MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ: z.number().int().default(3),
  MESSAGE_OTHERS_TYPING_WINDOW_MS: z.number().int().default(8000),
  MESSAGE_OTHERS_TYPING_MAX_WAIT_MS: z.number().int().default(5000),
  MESSAGE_ACTIVITY_TIME_WINDOW: z.number().int().default(300000),
  MESSAGE_WAKEWORDS: z.array(z.string()).default(['!help', '!ping']),
  MESSAGE_ONLY_WHEN_SPOKEN_TO: z.boolean().default(true),
  MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: z.number().int().default(300000),
  MESSAGE_INTERACTIVE_FOLLOWUPS: z.boolean().default(false),
  MESSAGE_UNSOLICITED_ADDRESSED: z.boolean().default(false),
  MESSAGE_UNSOLICITED_UNADDRESSED: z.boolean().default(false),
  MESSAGE_RESPOND_IN_THREAD: z.boolean().default(false),
  MESSAGE_THREAD_RELATION_WINDOW: z.number().int().default(300000),
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: z.number().default(0.5),
  MESSAGE_INTERROBANG_BONUS: z.number().default(0.4),
  MESSAGE_BOT_RESPONSE_MODIFIER: z.number().default(-0.1),
  MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION: z.boolean().default(true),
  MESSAGE_MAX_GENERATION_RETRIES: z.number().int().default(3),
  MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: z.boolean().default(false),
  MESSAGE_COMMAND_INLINE: z.boolean().default(true),
  MESSAGE_COMMAND_AUTHORISED_USERS: z.string().default(''),
  MESSAGE_LLM_FOLLOW_UP: z.boolean().default(false),
  MESSAGE_FOLLOW_UP_ENABLED: z.boolean().default(true),
  MESSAGE_LLM_CHAT: z.boolean().default(true),
  MESSAGE_LLM_COMPLETE_SENTENCE: z.boolean().default(true),
  MESSAGE_LLM_SUMMARISE: z.boolean().default(false),
  MESSAGE_COMMAND_SLASH: z.boolean().default(true),
  MESSAGE_WEBHOOK_ENABLED: z.boolean().default(true),
  MESSAGE_MENTION_BONUS: z.number().default(0.1),
  MESSAGE_FILTER_BY_USER: z.string().default(''),
  MESSAGE_HISTORY_LIMIT: z.number().int().default(30),
  MESSAGE_HISTORY_ADAPTIVE_ENABLED: z.boolean().default(true),
  MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT: z.number().int().default(6),
  MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT: z.number().int().default(60),
  MESSAGE_HISTORY_ADAPTIVE_STEP: z.number().int().default(5),
  MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION: z.number().default(0.75),
  MESSAGE_LLM_CONTEXT_WINDOW_TOKENS: z.number().int().default(8000),
  MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS: z.number().int().default(400),
  MESSAGE_DECAY_RATE: z.number().default(0.001),
  MESSAGE_CALM_WINDOW: z.number().int().default(300000),
  PLATFORM: z.string().default('discord'),
  NAME: z.string().default('Open-Hivemind'),
  BOT_ID: z.string().default('slack-bot'),
  MESSAGE_MIN_INTERVAL_MS: z.number().int().default(3000),
  MESSAGE_STRIP_BOT_ID: z.boolean().default(true),
  MESSAGE_USERNAME_OVERRIDE: z.string().default('Bot'),
  MESSAGE_CHANNEL_ROUTER_ENABLED: z.boolean().default(false),
   
  CHANNEL_BONUSES: z.preprocess((val: any) => {
    if (typeof val !== 'object' || val === null) return val;
    const clamped: Record<string, number> = {};
    for (const [k, v] of Object.entries(val)) {
      const num = Number(v);
      clamped[k] = isNaN(num) ? 0 : Math.max(0, Math.min(2, num));
    }
    return clamped;
  }, z.record(z.number())).default({}),
   
  CHANNEL_PRIORITIES: z.preprocess((val: any) => {
    if (typeof val !== 'object' || val === null) return val;
    const clamped: Record<string, number> = {};
    for (const [k, v] of Object.entries(val)) {
      const num = Number(v);
      clamped[k] = isNaN(num) ? 0 : Math.max(0, Math.floor(num));
    }
    return clamped;
  }, z.record(z.number())).default({}),
  MESSAGE_RESPONSE_PROFILES: z.record(z.record(z.union([z.number(), z.boolean()]))).default({
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
  }),
  greeting: z.object({
    disabled: z.boolean().default(false),
    message: z.string().default('Hello! I am online.'),
    use_llm: z.boolean().default(true),
  }).default({}),
  DISCORD_MESSAGE_TEMPLATES: z.record(z.string()).default({}),
});

export type MessageConfig = z.infer<typeof MessageSchema>;
