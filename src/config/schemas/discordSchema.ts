import { z } from 'zod';

/**
 * Discord configuration schema
 */
export const DiscordSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().default(''),
  DISCORD_CLIENT_ID: z.string().default(''),
  DISCORD_GUILD_ID: z.string().default(''),
  DISCORD_AUDIO_FILE_PATH: z.string().default('audio.wav'),
  DISCORD_WELCOME_MESSAGE: z.string().default('Welcome to the server!'),
  DISCORD_MESSAGE_HISTORY_LIMIT: z.number().int().default(10),
  DISCORD_CHANNEL_ID: z.string().default(''),
  DISCORD_DEFAULT_CHANNEL_ID: z.string().default(''),
   
   
   
  DISCORD_CHANNEL_BONUSES: z.preprocess((val: any) => {
    if (typeof val !== 'object' || val === null) return val;
    const clamped: Record<string, number> = {};
    for (const [k, v] of Object.entries(val)) {
      const num = Number(v);
      clamped[k] = isNaN(num) ? 0 : Math.max(0, Math.min(2, num));
    }
    return clamped;
  }, z.record(z.number())).default({}),
  DISCORD_UNSOLICITED_CHANCE_MODIFIER: z.number().default(1.0),
  DISCORD_VOICE_CHANNEL_ID: z.string().default(''),
  DISCORD_MAX_MESSAGE_LENGTH: z.number().int().default(2000),
  DISCORD_INTER_PART_DELAY_MS: z.number().int().default(1000),
  DISCORD_TYPING_DELAY_MAX_MS: z.number().int().default(5000),
  DISCORD_PRIORITY_CHANNEL: z.string().default(''),
  DISCORD_PRIORITY_CHANNEL_BONUS: z.number().default(1.1),
  DISCORD_LOGGING_ENABLED: z.boolean().default(false),
  DISCORD_MESSAGE_PROCESSING_DELAY_MS: z.number().int().default(0),
  DISCORD_USERNAME_OVERRIDE: z.string().default(''),
});

export type DiscordConfig = z.infer<typeof DiscordSchema>;
