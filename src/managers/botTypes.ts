import type { MCPGuardConfig } from '../mcp/MCPGuard';
import type { MCPConfig } from '../mcp/MCPService';

export interface BotInstance {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  /** Optional default model id for UI / test-drive display */
  llmModel?: string;
  /** Optional LLM profile key */
  llmProfile?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
  config: Record<string, unknown>;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: MCPConfig[];
  mcpGuard?: MCPGuardConfig;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
  /** Provider instance ID for the message provider (from ProviderConfigManager) */
  messageProviderInstanceId?: string;
  /** Provider instance ID for the LLM provider (from ProviderConfigManager) */
  llmProviderInstanceId?: string;
}

export interface CreateBotRequest {
  name: string;
  messageProvider: 'discord' | 'slack' | 'mattermost';
  llmProvider?: 'openai' | 'flowise' | 'openwebui' | 'openswarm';
  /** Default model id shown in the bot drawer / test-drive UI */
  llmModel?: string;
  /** Optional LLM profile key (e.g. golden-openai) */
  llmProfile?: string;
  description?: string;
  /** When true, the bot is created active (default false for safety) */
  isActive?: boolean;
  config?: {
    discord?: {
      token: string;
      voiceChannelId?: string;
    };
    slack?: {
      botToken: string;
      signingSecret: string;
      appToken?: string;
    };
    mattermost?: {
      serverUrl: string;
      token: string;
    };
    openai?: {
      apiKey: string;
      model?: string;
    };
    flowise?: {
      apiKey: string;
      endpoint?: string;
    };
    openwebui?: {
      apiKey: string;
      endpoint?: string;
    };
  };
  persona?: string;
  systemInstruction?: string;
  mcpServers?: MCPConfig[];
  mcpGuard?: MCPGuardConfig;
}
