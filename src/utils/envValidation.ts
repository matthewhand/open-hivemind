import { z } from 'zod';
import Logger from '../common/logger';

// Core startup variables, regardless of environment
const coreEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .passthrough();

// Production variables (only checked if NODE_ENV === 'production')
const productionEnvSchema = z
  .object({
    SESSION_SECRET: z
      .string({
        required_error: 'SESSION_SECRET is required in production.',
      })
      .min(1, 'SESSION_SECRET must not be empty in production.'),
    JWT_SECRET: z
      .string({
        required_error: 'JWT_SECRET is required in production.',
      })
      .min(1, 'JWT_SECRET must not be empty in production.'),
    JWT_REFRESH_SECRET: z
      .string({
        required_error: 'JWT_REFRESH_SECRET is required in production.',
      })
      .min(1, 'JWT_REFRESH_SECRET must not be empty in production.'),
  })
  .passthrough();

/**
 * Validates the presence of strictly required environment variables at startup.
 * Logs a fatal error and terminates the process if a strictly required variable is missing.
 */
export function validateRequiredEnvVars(): void {
  // 1. Validate Core Variables
  const coreResult = coreEnvSchema.safeParse(process.env);
  if (!coreResult.success) {
    logValidationErrors('CORE REQUIRED ENV VARS', coreResult.error);
    process.exit(1);
    return; // Exit point reached
  }

  const isProduction = coreResult.data.NODE_ENV === 'production';

  // 2. Validate Production Variables
  if (isProduction) {
    const prodResult = productionEnvSchema.safeParse(process.env);
    const missingVars: string[] = [];

    if (!prodResult.success) {
      prodResult.error.errors.forEach((e) => {
        missingVars.push(`${e.path.join('.')}: ${e.message}`);
      });
    }

    // Check that at least one bot token is configured
    const hasDiscord = !!process.env.DISCORD_BOT_TOKEN;
    const hasSlack = !!process.env.SLACK_BOT_TOKEN;
    const hasMattermost = !!process.env.MATTERMOST_TOKEN;

    // Also check dynamic bots (e.g., BOTS_ALPHA_DISCORD_BOT_TOKEN)
    const hasDynamicBot = Object.keys(process.env).some(
      (key) =>
        key.startsWith('BOTS_') &&
        (key.endsWith('_DISCORD_BOT_TOKEN') ||
          key.endsWith('_SLACK_BOT_TOKEN') ||
          key.endsWith('_MATTERMOST_TOKEN'))
    );

    if (!hasDiscord && !hasSlack && !hasMattermost && !hasDynamicBot) {
      missingVars.push(
        'DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN, or MATTERMOST_TOKEN: Production startup requires at least one messaging platform token to be configured.'
      );
    }

    if (missingVars.length > 0) {
      Logger.error('---------------------------------------------------------');
      Logger.error('🚨 CRITICAL STARTUP FAILURE: MISSING OR INVALID PRODUCTION ENV VARS');
      Logger.error('---------------------------------------------------------');
      Logger.error('The following environment variables MUST be defined and valid:');
      missingVars.forEach((v) => Logger.error(` - ${v}`));
      Logger.error('---------------------------------------------------------');
      Logger.error('Please configure them in your .env file or deployment settings.');
      Logger.error('System cannot start securely. Exiting now.');
      process.exit(1);
    }
  }
}

function logValidationErrors(title: string, error: z.ZodError): void {
  Logger.error('---------------------------------------------------------');
  Logger.error(`🚨 CRITICAL STARTUP FAILURE: ${title}`);
  Logger.error('---------------------------------------------------------');
  Logger.error('The following environment variables MUST be defined and valid:');
  error.errors.forEach((e) => Logger.error(` - ${e.path.join('.')}: ${e.message}`));
  Logger.error('---------------------------------------------------------');
  Logger.error('Please configure them in your .env file or deployment settings.');
  Logger.error('System cannot start securely. Exiting now.');
}
