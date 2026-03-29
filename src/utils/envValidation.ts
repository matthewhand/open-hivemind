import { z } from 'zod';
import Logger from '../common/logger';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .optional()
      .default('development'),
    PORT: z
      .string()
      .regex(/^\d+$/, 'PORT must be a valid number')
      .optional(),
    HTTP_ENABLED: z
      .enum(['true', 'false'])
      .optional(),
    SKIP_MESSENGERS: z
      .enum(['true', 'false'])
      .optional(),
    SESSION_SECRET: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_REFRESH_SECRET: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string().optional(),
    SLACK_BOT_TOKEN: z.string().optional(),
    MATTERMOST_TOKEN: z.string().optional(),
  })
  .passthrough() // Allow other environment variables
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.SESSION_SECRET || env.SESSION_SECRET.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SESSION_SECRET is required in production',
          path: ['SESSION_SECRET'],
        });
      }
      if (!env.JWT_SECRET || env.JWT_SECRET.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_SECRET is required in production',
          path: ['JWT_SECRET'],
        });
      }
      if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'JWT_REFRESH_SECRET is required in production',
          path: ['JWT_REFRESH_SECRET'],
        });
      }

      const hasDiscord = !!env.DISCORD_BOT_TOKEN;
      const hasSlack = !!env.SLACK_BOT_TOKEN;
      const hasMattermost = !!env.MATTERMOST_TOKEN;

      // Also check dynamic bots (e.g., BOTS_ALPHA_DISCORD_BOT_TOKEN)
      // Since passthrough() allows other keys, they are available in the env object
      const hasDynamicBot = Object.keys(env).some(
        (key) =>
          key.startsWith('BOTS_') &&
          (key.endsWith('_DISCORD_BOT_TOKEN') ||
            key.endsWith('_SLACK_BOT_TOKEN') ||
            key.endsWith('_MATTERMOST_TOKEN'))
      );

      if (!hasDiscord && !hasSlack && !hasMattermost && !hasDynamicBot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production startup requires at least one messaging platform token to be configured.',
          path: ['DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN, or MATTERMOST_TOKEN'],
        });
      }
    }
  });

/**
 * Validates the presence and format of strictly required environment variables at startup using Zod.
 * Logs a fatal error and terminates the process if validation fails.
 */
export function validateRequiredEnvVars(): void {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    Logger.error('---------------------------------------------------------');
    Logger.error('🚨 CRITICAL STARTUP FAILURE: INVALID ENVIRONMENT VARIABLES');
    Logger.error('---------------------------------------------------------');

    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      Logger.error(` - ${path}: ${issue.message}`);
    });

    Logger.error('---------------------------------------------------------');
    Logger.error('Please configure them correctly in your .env file or deployment settings.');
    Logger.error('System cannot start securely. Exiting now.');
    process.exit(1);
  }
}
