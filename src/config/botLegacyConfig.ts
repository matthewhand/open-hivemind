/**
 * Legacy configuration loading for backward compatibility.
 * Supports the old DISCORD_BOT_TOKEN-based configuration format.
 * Extracted from BotConfigurationManager.
 */

import Debug from 'debug';

import type {
  BotConfig,
  LlmProvider,
} from '@src/types/config';

const debug = Debug('app:BotConfigurationManager');

/**
 * Load legacy configuration from DISCORD_BOT_TOKEN environment variable.
 * Returns the loaded bots and whether legacy mode was activated.
 */
export function loadLegacyBots(): { bots: Map<string, BotConfig>; legacyMode: boolean } {
  const bots = new Map<string, BotConfig>();
  const legacyTokens = process.env.DISCORD_BOT_TOKEN;

  if (!legacyTokens || !legacyTokens.trim()) {
    return { bots, legacyMode: false };
  }

  debug('Loading legacy configuration from DISCORD_BOT_TOKEN');

  const tokens = legacyTokens.split(',').map(token => token.trim());

  tokens.forEach((token, index) => {
    const botName = `Bot${index + 1}`;
    const config: BotConfig = {
      name: botName,
      messageProvider: 'discord',
      llmProvider: detectLegacyLlmProvider() as LlmProvider,
      discord: {
        token,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
        channelId: process.env.DISCORD_CHANNEL_ID,
        voiceChannelId: process.env.DISCORD_VOICE_CHANNEL_ID,
      },
    };

    // Populate LLM config from environment variables
    if (config.llmProvider === 'openai' && process.env.OPENAI_API_KEY) {
      config.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        systemPrompt: process.env.OPENAI_SYSTEM_PROMPT || '',
      };
    } else if (config.llmProvider === 'flowise' && process.env.FLOWISE_API_KEY) {
      config.flowise = {
        apiKey: process.env.FLOWISE_API_KEY,
        apiBaseUrl: process.env.FLOWISE_API_BASE_URL || 'http://localhost:3000/api/v1',
      };
    } else if (config.llmProvider === 'openwebui' && process.env.OPENWEBUI_API_KEY) {
      config.openwebui = {
        apiKey: process.env.OPENWEBUI_API_KEY,
        apiUrl: process.env.OPENWEBUI_API_URL || 'http://localhost:3000/api/',
      };
    } else if (config.llmProvider === 'openswarm') {
      config.openswarm = {
        baseUrl: process.env.OPENSWARM_BASE_URL || 'http://localhost:8000/v1',
        apiKey: process.env.OPENSWARM_API_KEY || 'dummy-key',
        team: process.env.OPENSWARM_TEAM || 'default-team',
      };
    }

    bots.set(botName, config);
  });

  return { bots, legacyMode: true };
}

/**
 * Detect LLM provider from legacy environment variables
 */
function detectLegacyLlmProvider(): string {
  if (process.env.OPENAI_API_KEY) { return 'openai'; }
  if (process.env.FLOWISE_API_KEY) { return 'flowise'; }
  if (process.env.OPENWEBUI_API_KEY) { return 'openwebui'; }
  if (process.env.OPENSWARM_BASE_URL) { return 'openswarm'; }
  return 'flowise'; // Default fallback
}
