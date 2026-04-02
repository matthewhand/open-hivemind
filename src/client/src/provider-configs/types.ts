import Debug from 'debug';
const debug = Debug('app:client:provider-configs:types');
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// Provider-specific configuration types - separate from core bot types
// This allows for a pluggable architecture where providers can define their own configs

/**
 * Provider type taxonomy:
 *   'llm'     — inference providers (openai, flowise, openwebui, letta, ollama, ...)
 *   'message' — chat platform adapters (discord, slack, mattermost, telegram, ...)
 *   'memory'  — external memory stores (mem0, memvault, zep, ...)
 *   'tool'    — tool/function providers; subtypes include:
 *                 'mcp'      — Model Context Protocol servers
 *                 'skill'    — TODO: packaged capability bundles (investigate)
 *                 'function' — TODO: direct function registration
 *                 'builtin'  — TODO: hardcoded system capabilities
 */
export interface ProviderConfigSchema {
  type: 'message' | 'llm' | 'memory' | 'tool';
  providerType: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  fields: ProviderConfigField[];
  defaultConfig?: Record<string, any>;
}

export interface ProviderConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'url' | 'json' | 'select' | 'multiselect' | 'boolean' | 'textarea' | 'model-autocomplete' | 'keyvalue' | 'checkbox';
  required: boolean;
  description?: string;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    maxItems?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  options?: Array<{ label: string; value: any; description?: string }>;
  defaultValue?: any;
  group?: string;
  // Additional props for custom field types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: any;
  componentProps?: Record<string, any>;
  dependsOn?: string | { field: string; value: any }; // Field dependency
  // Helper action for fetching data (e.g., agent lookup)
  helperAction?: {
    type: 'fetch';
    label: string;
    description: string;
    endpoint: string;
    method: 'GET' | 'POST';
    targetField: string;
    valuePath: string;
  };
}

export interface ProviderConfigFormProps {
  providerType?: string;
  schema: ProviderConfigSchema;
  initialConfig?: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  onTestConnection?: (config: Record<string, any>) => Promise<boolean>;
  onAvatarLoad?: (config: Record<string, any>) => Promise<string | null>;
  externalErrors?: Record<string, string>;
}

export interface ProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerType: string;
  schema: ProviderConfigSchema;
  initialConfig?: Record<string, any>;
  onSave: (config: Record<string, any>) => void;
  onTestConnection?: (config: Record<string, any>) => Promise<boolean>;
  title?: string;
}

export interface ProviderSchema {
  type: 'tool';
  name: string;
  description: string;
  version: string;
  servers: MCPServerDefinition[];
}

export interface MCPServerDefinition {
  name: string;
  description: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

// Avatar service interface
export class AvatarService {
  static async loadAvatar(providerType: string, config: Record<string, any>): Promise<string | null> {
    try {
      // Mock implementation - in real app would fetch from provider APIs
      if (providerType === 'slack' && config.teamId) {
        return `https://api.slack.com/avatars/${config.teamId}`;
      }
      if (providerType === 'discord' && config.guildId) {
        return `https://cdn.discordapp.com/icons/${config.guildId}`;
      }
      return null;
    } catch (error) {
      debug('ERROR:', 'Failed to load avatar:', error);
      return null;
    }
  }
}

