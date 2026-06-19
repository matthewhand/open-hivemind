import { z } from 'zod';
import Logger from '../common/logger';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
    PORT: z.string().regex(/^\d+$/, 'PORT must be a valid number').optional(),
    HTTP_ENABLED: z.enum(['true', 'false']).optional(),
    SKIP_MESSENGERS: z.enum(['true', 'false']).optional(),
    SESSION_SECRET: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_REFRESH_SECRET: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string().trim().min(1, 'DISCORD_BOT_TOKEN must not be empty').optional(),
    SLACK_BOT_TOKEN: z.string().trim().min(1, 'SLACK_BOT_TOKEN must not be empty').optional(),
    MATTERMOST_TOKEN: z.string().trim().min(1, 'MATTERMOST_TOKEN must not be empty').optional(),
    HIVEMIND_PLUGIN_SIGNING_KEY: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
  })
  .passthrough() // Allow other environment variables
  .superRefine((env, ctx) => {
    // ALLOW_INSECURE_PRODUCTION=true opts out of the production-required checks so
    // the app boots lean (degraded features) instead of failing closed. Mirrors the
    // inline guards in EncryptionService / AuthManager / PluginManager. Base-schema
    // validations (PORT format, non-empty tokens) still apply regardless.
    const allowInsecure = process.env.ALLOW_INSECURE_PRODUCTION === 'true';
    if (env.NODE_ENV === 'production' && !allowInsecure) {
      if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'OPENAI_API_KEY is required in production',
          path: ['OPENAI_API_KEY'],
        });
      }
      if (!env.HIVEMIND_PLUGIN_SIGNING_KEY || env.HIVEMIND_PLUGIN_SIGNING_KEY.trim().length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'HIVEMIND_PLUGIN_SIGNING_KEY is required in production and must be at least 32 characters',
          path: ['HIVEMIND_PLUGIN_SIGNING_KEY'],
        });
      }
      if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.trim().length < 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ADMIN_PASSWORD is required in production and must be at least 12 characters',
          path: ['ADMIN_PASSWORD'],
        });
      }
      if (!env.SESSION_SECRET || env.SESSION_SECRET.trim().length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SESSION_SECRET is required in production and must be at least 32 characters',
          path: ['SESSION_SECRET'],
        });
      }
      if (!env.JWT_SECRET || env.JWT_SECRET.trim().length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET is required in production and must be at least 32 characters',
          path: ['JWT_SECRET'],
        });
      }
      if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.trim().length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'JWT_REFRESH_SECRET is required in production and must be at least 32 characters',
          path: ['JWT_REFRESH_SECRET'],
        });
      }

      const hasDiscord = !!env.DISCORD_BOT_TOKEN?.trim();
      const hasSlack = !!env.SLACK_BOT_TOKEN?.trim();
      const hasMattermost = !!env.MATTERMOST_TOKEN?.trim();

      // Also check dynamic bots (e.g., BOTS_ALPHA_DISCORD_BOT_TOKEN)
      // Since passthrough() allows other keys, they are available in the env object
      const hasDynamicBot = Object.keys(env).some(
        (key) =>
          key.startsWith('BOTS_') &&
          (key.endsWith('_DISCORD_BOT_TOKEN') ||
            key.endsWith('_SLACK_BOT_TOKEN') ||
            key.endsWith('_MATTERMOST_TOKEN')) &&
          !!(env as Record<string, string>)[key]?.trim()
      );

      // SKIP_MESSENGERS=true is an explicit operator choice to run without
      // messenger services (e.g. WebUI-only deployments) — requiring a
      // platform token in that mode contradicts the flag.
      const skipMessengers = env.SKIP_MESSENGERS?.trim().toLowerCase() === 'true';
      if (!skipMessengers && !hasDiscord && !hasSlack && !hasMattermost && !hasDynamicBot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Production startup requires at least one messaging platform token to be configured (or SKIP_MESSENGERS=true for WebUI-only mode).',
          path: ['DISCORD_BOT_TOKEN'],
        });
      }
    }
  });

/**
 * Validates the presence and format of strictly required environment variables at startup using Zod.
 * Throws an error if validation fails, allowing the caller to decide how to handle it.
 */
export function validateRequiredEnvVars(): void {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_PRODUCTION === 'true') {
    Logger.warn(
      '[SECURITY] ALLOW_INSECURE_PRODUCTION=true — skipping production env-var requirements ' +
        '(OPENAI_API_KEY, SESSION_SECRET, JWT/signing secrets, admin password, messaging token). ' +
        'The app will boot with degraded/disabled features. Configure these for a secure deployment.'
    );
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    Logger.error('---------------------------------------------------------');
    Logger.error('\ud83d\udea8 CRITICAL STARTUP FAILURE: INVALID ENVIRONMENT VARIABLES');
    Logger.error('---------------------------------------------------------');

    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      Logger.error(` - ${path}: ${issue.message}`);
    });

    Logger.error('---------------------------------------------------------');
    Logger.error('Please configure them correctly in your .env file or deployment settings.');
    Logger.error('System cannot start securely.');

    // Throw error instead of calling process.exit() - let the caller decide
    throw new Error(
      'Environment validation failed: ' +
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
    );
  }
}
