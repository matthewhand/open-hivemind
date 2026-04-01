import type { MCPGuardConfig } from '../mcp/MCPGuard';
import type { MCPConfig } from '../mcp/MCPService';

export interface BotInstance {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  isActive: boolean;
  createdAt: string;
  lastModified: string;
  config: Record<string, unknown>;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: MCPConfig[];
  mcpGuard?: MCPGuardConfig;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
}

export interface CreateBotRequest {
  name: string;
  messageProvider: 'discord' | 'slack' | 'mattermost';
  llmProvider?: 'openai' | 'flowise' | 'openwebui' | 'openswarm';
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
