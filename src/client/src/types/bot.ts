/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
export interface BotInstance {
  id: string;
  name: string;
  description?: string;
  status: BotStatus;
  provider: MessageProvider | LLMProvider;
  messageProviders: MessageProvider[];
  llmProviders: LLMProvider[];
  persona?: Persona;
  personaId?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  error?: string | null;
  config: Record<string, any>;
  envOverrides?: Record<string, any>;
}

export const BOT_STATUSES = ['active', 'inactive', 'error', 'starting', 'stopping'] as const;
export type BotStatus = typeof BOT_STATUSES[number];

export const MESSAGE_PROVIDER_TYPES = ['discord', 'slack', 'mattermost', 'webhook'] as const;
export type MessageProviderType = typeof MESSAGE_PROVIDER_TYPES[number];

export const LLM_PROVIDER_TYPES = ['openai', 'anthropic', 'flowise', 'openwebui', 'perplexity', 'replicate', 'n8n', 'openswarm'] as const;
export type LLMProviderType = typeof LLM_PROVIDER_TYPES[number];

export const PersonaCategory = {
  GENERAL: 'general',
  PROFESSIONAL: 'professional',
  CREATIVE: 'creative',
  TECHNICAL: 'technical',
  CASUAL: 'casual',
  EDUCATIONAL: 'educational',
  ENTERTAINMENT: 'entertainment',
  CUSTOMER_SERVICE: 'customer_service',
} as const;

export type PersonaCategory = typeof PersonaCategory[keyof typeof PersonaCategory];

export interface MessageProvider {
  id: string;
  type: MessageProviderType;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface LLMProvider {
  id: string;
  type: LLMProviderType;
  name: string;
  config: Record<string, any>;
  modelType?: 'chat' | 'embedding' | 'both';
  enabled: boolean;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  category: PersonaCategory | string;
  traits: PersonaTrait[];
  systemPrompt: string;
  isBuiltIn?: boolean;
  usageCount?: number;
  avatarId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaTrait {
  name: string;
  value: string;
  weight: number;
  type?: string;
}

export interface CreatePersonaRequest {
  name: string;
  description: string;
  category: PersonaCategory;
  traits: PersonaTrait[];
  systemPrompt: string;
}

export interface UpdatePersonaRequest {
  id: string;
  name?: string;
  description?: string;
  category?: PersonaCategory;
  traits?: PersonaTrait[];
  systemPrompt?: string;
}

export interface ProviderModalState {
  isOpen: boolean;
  providerType: MessageProviderType | LLMProviderType | 'message' | 'llm';
  provider?: MessageProvider | LLMProvider;
  mode: 'create' | 'edit';
  botId?: string | null;
  isEdit?: boolean;
}

export interface ProviderTypeConfig {
  type: MessageProviderType | LLMProviderType;
  displayName: string;
  description: string;
  icon: string;
  fields: FieldConfig[];
}

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface Bot {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  llmProfile?: string;
  responseProfile?: string;
  mcpGuardProfile?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: Array<{ name: string; serverUrl?: string }> | string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  isActive?: boolean;
  envOverrides?: Record<string, any>;
  metadata?: Record<string, any>;
  discord?: {
    token?: string;
    clientId?: string;
    guildId?: string;
    channelId?: string;
    voiceChannelId?: string;
  };
  slack?: {
    botToken?: string;
    appToken?: string;
    signingSecret?: string;
    teamId?: string;
    channels?: string[];
    defaultChannelId?: string;
    mode?: string;
  };
  mattermost?: {
    url?: string;
    accessToken?: string;
    teamId?: string;
    channelId?: string;
    channel?: string;
  };
  openai?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  };
  anthropic?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  flowise?: {
    apiKey?: string;
    apiUrl?: string;
    chatflowId?: string;
  };
  openwebui?: {
    apiKey?: string;
    apiUrl?: string;
    model?: string;
  };
  openswarm?: {
    apiKey?: string;
    apiUrl?: string;
    swarmId?: string;
    team?: string;
  };
  perplexity?: {
    apiKey?: string;
    model?: string;
  };
  replicate?: {
    apiKey?: string;
    model?: string;
    version?: string;
  };
  n8n?: {
    apiUrl?: string;
    apiKey?: string;
    workflowId?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type CreateBotRequest = Omit<Bot, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>;

export const MESSAGE_PROVIDER_CONFIGS = {
  slack: {
    type: 'slack' as MessageProviderType,
    displayName: 'Slack',
    description: 'Connect to Slack workspaces',
    icon: '💬',
    fields: [
      { name: 'botToken', label: 'Bot User OAuth Token', type: 'password', required: true },
      { name: 'appToken', label: 'App-Level Token', type: 'password', required: true },
      { name: 'signingSecret', label: 'Signing Secret', type: 'password', required: true },
    ],
  },
  discord: {
    type: 'discord' as MessageProviderType,
    displayName: 'Discord',
    description: 'Connect to Discord servers',
    icon: '🎮',
    fields: [
      { name: 'token', label: 'Bot Token', type: 'password', required: true },
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    ],
  },
  webhook: {
    type: 'webhook' as MessageProviderType,
    displayName: 'Webhook',
    description: 'Generic webhook integration',
    icon: '🔗',
    fields: [
      { name: 'url', label: 'Webhook URL', type: 'text', required: true },
      { name: 'secret', label: 'Secret', type: 'password', required: false },
    ],
  },
  mattermost: {
    type: 'mattermost' as MessageProviderType,
    displayName: 'Mattermost',
    description: 'Connect to Mattermost instances',
    icon: '💻',
    fields: [
      { name: 'url', label: 'Server URL', type: 'text', required: true },
      { name: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { name: 'teamId', label: 'Team ID', type: 'text', required: false },
    ],
  },
};

export const LLM_PROVIDER_CONFIGS = {
  openai: {
    type: 'openai' as LLMProviderType,
    displayName: 'OpenAI',
    description: 'GPT models from OpenAI',
    icon: '🤖',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Default Model', type: 'text', required: false, placeholder: 'gpt-4o' },
    ],
  },
  anthropic: {
    type: 'anthropic' as LLMProviderType,
    displayName: 'Anthropic',
    description: 'Claude models from Anthropic',
    icon: '🧠',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Default Model', type: 'text', required: false, placeholder: 'claude-3-5-sonnet-20241022' },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', required: false, placeholder: '4096' },
      { name: 'temperature', label: 'Temperature', type: 'number', required: false, placeholder: '1.0' },
    ],
  },
  flowise: {
    type: 'flowise' as LLMProviderType,
    displayName: 'Flowise',
    description: 'Visual LLM orchestration',
    icon: '🌊',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { name: 'chatflowId', label: 'Chatflow ID', type: 'text', required: true },
    ],
  },
  perplexity: {
    type: 'perplexity' as LLMProviderType,
    displayName: 'Perplexity',
    description: 'Search-augmented AI models',
    icon: '🔍',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Model', type: 'text', required: false },
    ],
  },
  replicate: {
    type: 'replicate' as LLMProviderType,
    displayName: 'Replicate',
    description: 'Run open-source models',
    icon: '🚀',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Model', type: 'text', required: false },
    ],
  },
  n8n: {
    type: 'n8n' as LLMProviderType,
    displayName: 'n8n',
    description: 'Workflow automation platform',
    icon: '⚡',
    fields: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true },
      { name: 'authHeader', label: 'Auth Header', type: 'password', required: false },
    ],
  },
  openswarm: {
    type: 'openswarm' as LLMProviderType,
    displayName: 'OpenSwarm',
    description: 'Multi-agent orchestration',
    icon: '🐝',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { name: 'swarmId', label: 'Swarm ID', type: 'text', required: true },
      { name: 'team', label: 'Team', type: 'text', required: false },
    ],
  },
};

export const DEFAULT_PERSONA: Persona = {
  id: 'default',
  name: 'Helpful Assistant',
  description: 'A friendly and helpful AI assistant',
  systemPrompt: 'You are a helpful assistant. Be polite, professional, and provide accurate information.',
  traits: [
    { name: 'Tone', value: 'Friendly', weight: 1 },
    { name: 'Style', value: 'Professional', weight: 1 },
  ],
  category: 'professional',
  isBuiltIn: true,
  usageCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const BUILTIN_PERSONAS: Persona[] = [
  DEFAULT_PERSONA,
  {
    id: 'customer_service',
    name: 'Customer Service Agent',
    description: 'Professional and empathetic customer service representative',
    systemPrompt: 'You are a customer service agent. Be polite, empathetic, and helpful.',
    traits: [
      { name: 'Tone', value: 'Professional', weight: 1 },
      { name: 'Style', value: 'Empathetic', weight: 1 },
    ],
    category: 'professional',
    isBuiltIn: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'technical_support',
    name: 'Technical Support Specialist',
    description: 'Knowledgeable technical support expert',
    systemPrompt: 'You are a technical support specialist. Provide clear, step-by-step assistance.',
    traits: [
      { name: 'Tone', value: 'Analytical', weight: 1 },
      { name: 'Style', value: 'Technical', weight: 1 },
    ],
    category: 'technical',
    isBuiltIn: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'creative_writer',
    name: 'Creative Writer',
    description: 'Imaginative and artistic content creator',
    systemPrompt: 'You are a creative writer. Use vivid language and engaging storytelling.',
    traits: [
      { name: 'Tone', value: 'Creative', weight: 1 },
      { name: 'Style', value: 'Artistic', weight: 1 },
    ],
    category: 'creative',
    isBuiltIn: true,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface PersonaModalState {
  isOpen: boolean;
  persona?: Persona;
  mode: 'create' | 'edit';
}

/**
 * Client-side bot configuration type representing the runtime shape
 * returned by the /api/bots endpoint. Extends the base Bot type with
 * UI-specific fields populated by the server status response.
 */
export interface BotConfig extends Bot {
  id: string;
  status?: string;
  description?: string;
  llmModel?: string;
  messageCount?: number;
  errorCount?: number;
  connected?: boolean;
  provider?: string;
  config?: Record<string, any>;
  envOverrides?: Record<string, any>;
}
