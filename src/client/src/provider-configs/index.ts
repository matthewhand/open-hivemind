// Export all provider schemas
export * from './types';
export * from './schemas/discord';
export * from './schemas/slack';
export * from './schemas/openai';
export * from './schemas/anthropic';
export * from './schemas/ollama';
export * from './schemas/telegram';
export * from './schemas/mcp';
export * from './schemas/flowise';

// Registry of all available provider schemas
import type { ProviderConfigSchema } from './types';
import { discordProviderSchema } from './schemas/discord';
import { slackProviderSchema } from './schemas/slack';
import { openAIProviderSchema } from './schemas/openai';
import { anthropicProviderSchema } from './schemas/anthropic';
import { ollamaProviderSchema } from './schemas/ollama';
import { telegramProviderSchema } from './schemas/telegram';
import { mcpProviderSchema } from './schemas/mcp';
import { flowiseProviderSchema } from './schemas/flowise';

export const PROVIDER_SCHEMAS: Record<string, ProviderConfigSchema> = {
  // Message providers
  discord: discordProviderSchema,
  slack: slackProviderSchema,
  telegram: telegramProviderSchema,

  // LLM providers
  openai: openAIProviderSchema,
  anthropic: anthropicProviderSchema,
  ollama: ollamaProviderSchema,
  flowise: flowiseProviderSchema,

  // MCP providers
  mcp: mcpProviderSchema,
};

// Helper functions for working with provider schemas
export const getProviderSchema = (providerType: string): ProviderConfigSchema | undefined => {
  return PROVIDER_SCHEMAS[providerType];
};

export const getProviderSchemasByType = (type: 'message' | 'llm' | 'mcp'): ProviderConfigSchema[] => {
  return Object.values(PROVIDER_SCHEMAS).filter(schema => schema.type === type);
};

export const getAllProviderSchemas = (): ProviderConfigSchema[] => {
  return Object.values(PROVIDER_SCHEMAS);
};