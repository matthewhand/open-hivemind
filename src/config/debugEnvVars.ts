/**
 * @fileoverview Debug utility for logging and validating environment variables
 * @module config/debugEnvVars
 * @description Provides functionality to debug environment variables by logging them
 * in a secure manner (redacting sensitive information) and checking for required
 * variables based on configured providers.
 */

import { redactSensitiveInfo } from '../common/redactSensitiveInfo';
import Debug from 'debug';

const debug = Debug('app:debugEnvVars');

/**
 * Debug and validate environment variables for the application.
 *
 * @function debugEnvVars
 * @description This function performs two main tasks:
 * 1. Logs all environment variables while redacting sensitive information
 * 2. Checks for missing required environment variables based on configured providers
 *
 * @returns {void}
 *
 * @example
 * ```typescript
 * import { debugEnvVars } from './config/debugEnvVars';
 *
 * // Debug environment variables at startup
 * debugEnvVars();
 * ```
 *
 * @description
 * The function automatically detects which environment variables are required
 * based on the MESSAGE_PROVIDER and LLM_PROVIDER configuration:
 *
 * - Discord provider requires: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID
 * - Slack provider requires: SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET
 * - OpenAI provider requires: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
 * - Flowise provider requires: FLOWISE_API_KEY, FLOWISE_API_ENDPOINT
 *
 * Sensitive information (variables containing KEY, TOKEN, SECRET, or PASSWORD)
 * is automatically redacted before logging.
 */
export function debugEnvVars() {
  debug('=== Environment Variables ===');
  
  // Iterate over all environment variables
  Object.keys(process.env).forEach(key => {
    if (key === 'BOT_DEBUG_MODE') {
      return; // Skip BOT_DEBUG_MODE
    }
    // Security: Skip any variables that might contain credentials
    if (key.includes('TOKEN') || key.includes('KEY') || key.includes('SECRET') || key.includes('PASSWORD')) {
      debug(`Skipping sensitive variable: ${key}`);
      return;
    }
    let value = process.env[key] || '';
    const upperKey = key.toUpperCase();
    // Redact variables containing KEY, TOKEN, or ending with SECRET
    if (upperKey.includes('KEY') || upperKey.includes('TOKEN') || upperKey.endsWith('SECRET') || upperKey.endsWith('PASSWORD')) {
      value = redactSensitiveInfo(key, value);
    }
    debug(`${key} = ${value}`);
  });

  // Check for required environment variables based on configured providers
  const requiredEnvVars = new Set<string>();
  const messageProvider = process.env['MESSAGE_PROVIDER'] || '';
  const llmProvider = process.env['LLM_PROVIDER'] || '';

  if (messageProvider.toLowerCase().includes('discord')) {
    requiredEnvVars.add('DISCORD_BOT_TOKEN');
    requiredEnvVars.add('DISCORD_CLIENT_ID');
    requiredEnvVars.add('DISCORD_GUILD_ID');
  }
  if (messageProvider.toLowerCase().includes('slack')) {
    requiredEnvVars.add('SLACK_BOT_TOKEN');
    requiredEnvVars.add('SLACK_APP_TOKEN');
    requiredEnvVars.add('SLACK_SIGNING_SECRET');
  }
  if (llmProvider.toLowerCase().includes('openai')) {
    requiredEnvVars.add('OPENAI_API_KEY');
    requiredEnvVars.add('OPENAI_BASE_URL');
    requiredEnvVars.add('OPENAI_MODEL');
  }
  if (llmProvider.toLowerCase().includes('flowise')) {
    requiredEnvVars.add('FLOWISE_API_KEY');
    requiredEnvVars.add('FLOWISE_API_ENDPOINT');
  }

  if (requiredEnvVars.size > 0) {
    debug('=== Checking for Missing Required Environment Variables ===');
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        debug(`WARNING: Required environment variable ${varName} is missing!`);
      }
    });
  }
}
