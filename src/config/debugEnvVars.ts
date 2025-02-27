import { redactSensitiveInfo } from '../common/redactSensitiveInfo';
import Debug from 'debug';

const debug = Debug('app:debugEnvVars');

export function debugEnvVars() {
  debug('=== Environment Variables ===');
  
  // Iterate over all environment variables
  Object.keys(process.env).forEach(key => {
    if (key === 'BOT_DEBUG_MODE') {
      return; // Skip BOT_DEBUG_MODE
    }
    let value = process.env[key] || '';
    const upperKey = key.toUpperCase();
    // Redact variables containing KEY, TOKEN, or ending with SECRET
    if (upperKey.includes('KEY') || upperKey.includes('TOKEN') || upperKey.endsWith('SECRET') || upperKey.endsWith('PASSWORD')) {
      value = redactSensitiveInfo(value, 4);
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
