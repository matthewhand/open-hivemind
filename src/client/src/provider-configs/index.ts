// Export all provider schemas
export type { ProviderConfigSchema, ProviderConfigField, ProviderConfigFormProps, ProviderConfigModalProps, ProviderSchema, MCPServerDefinition, AvatarService } from './types';

// Registry of all available provider schemas

import { discordProviderSchema } from './schemas/discord';
import { slackProviderSchema } from './schemas/slack';
import { openAIProviderSchema } from './schemas/openai';
import { telegramProviderSchema } from './schemas/telegram';
import { mcpProviderSchema } from './schemas/mcp';
import { flowiseProviderSchema } from './schemas/flowise';
import { mattermostProviderSchema } from './schemas/mattermost';
import { openWebUiProviderSchema } from './schemas/openwebui';
import { lettaProviderSchema } from './schemas/letta';
import { mem0ProviderSchema } from './schemas/mem0';
import { mem4aiProviderSchema } from './schemas/mem4ai';

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

  // Memory providers
  mem0: mem0ProviderSchema,
  mem4ai: mem4aiProviderSchema,

  // LLM providers (extended)
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