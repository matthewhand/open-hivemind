import Logger from '../common/logger';

/**
 * Validates the presence of strictly required environment variables at startup.
 * Logs a fatal error and terminates the process if a strictly required variable is missing.
 */
export function validateRequiredEnvVars(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars: string[] = [];

  // Variables strictly required for PRODUCTION execution
  if (isProduction) {
    if (!process.env.SESSION_SECRET) missingVars.push('SESSION_SECRET');
    if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
    if (!process.env.JWT_REFRESH_SECRET) missingVars.push('JWT_REFRESH_SECRET');

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
      Logger.error(
        'Production startup requires at least one messaging platform token to be configured.'
      );
      missingVars.push('DISCORD_BOT_TOKEN, SLACK_BOT_TOKEN, or MATTERMOST_TOKEN');
    }
  }

  // Variables that are ALWAYS required regardless of environment
  // e.g. if we add DATABASE_URL later
  // if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');

  if (missingVars.length > 0) {
    Logger.error('---------------------------------------------------------');
    Logger.error('🚨 CRITICAL STARTUP FAILURE: MISSING REQUIRED ENV VARS');
    Logger.error('---------------------------------------------------------');
    Logger.error('The following environment variables MUST be defined:');
    missingVars.forEach((v) => Logger.error(` - ${v}`));
    Logger.error('---------------------------------------------------------');
    Logger.error('Please configure them in your .env file or deployment settings.');
    Logger.error('System cannot start securely. Exiting now.');
    process.exit(1);
  }
}
