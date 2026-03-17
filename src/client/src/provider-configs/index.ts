// Export all provider schemas
export * from './types';
export * from './schemas/discord';
export * from './schemas/slack';
export * from './schemas/openai';
export * from './schemas/telegram';
export * from './schemas/mcp';
export * from './schemas/flowise';
export * from './schemas/openwebui';
export * from './schemas/mattermost';
export * from './schemas/letta';

// Registry of all available provider schemas
import type { ProviderConfigSchema } from './types';
import { discordProviderSchema } from './schemas/discord';
import { slackProviderSchema } from './schemas/slack';
import { openAIProviderSchema } from './schemas/openai';
import { telegramProviderSchema } from './schemas/telegram';
import { mcpProviderSchema } from './schemas/mcp';
import { flowiseProviderSchema } from './schemas/flowise';
import { mattermostProviderSchema } from './schemas/mattermost';
import { openWebUiProviderSchema } from './schemas/openwebui';
import { lettaProviderSchema } from './schemas/letta';

export const PROVIDER_SCHEMAS: Record<string, ProviderConfigSchema> = {
  // Message providers
  discord: discordProviderSchema,
  slack: slackProviderSchema,
  telegram: telegramProviderSchema,
  mattermost: mattermostProviderSchema,

  // LLM providers
  openai: openAIProviderSchema,
  flowise: flowiseProviderSchema,
  openwebui: openWebUiProviderSchema,
  letta: lettaProviderSchema,

  // MCP providers
  mcp: mcpProviderSchema,
};

// Helper functions for working with provider schemas
export const getProviderSchema = (providerType: string): ProviderConfigSchema | undefined => {
  return PROVIDER_SCHEMAS[providerType];
};

export const getProviderSchemasByType = (type: 'message' | 'llm' | 'memory' | 'tool'): ProviderConfigSchema[] => {
  return Object.values(PROVIDER_SCHEMAS).filter(schema => schema.type === type);
};

export const getAllProviderSchemas = (): ProviderConfigSchema[] => {
  return Object.values(PROVIDER_SCHEMAS);
};