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

export const BOT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  STARTING: 'starting',
  STOPPING: 'stopping'
} as const;

export type BotStatus = typeof BOT_STATUSES[keyof typeof BOT_STATUSES];

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

export const MESSAGE_PROVIDER_TYPES = {
  DISCORD: 'discord',
  SLACK: 'slack',
  MATTERMOST: 'mattermost',
  WEBHOOK: 'webhook',
} as const;

export type MessageProviderType = typeof MESSAGE_PROVIDER_TYPES[keyof typeof MESSAGE_PROVIDER_TYPES];

export const LLM_PROVIDER_TYPES = {
  OPENAI: 'openai',
  FLOWISE: 'flowise',
  OPENWEBUI: 'openwebui',
  PERPLEXITY: 'perplexity',
  REPLICATE: 'replicate',
  N8N: 'n8n',
  OPENSWARM: 'openswarm',
} as const;

export type LLMProviderType = typeof LLM_PROVIDER_TYPES[keyof typeof LLM_PROVIDER_TYPES];

/** Unified const merging all provider type values for single-import convenience */
export const PROVIDER_TYPES = { ...MESSAGE_PROVIDER_TYPES, ...LLM_PROVIDER_TYPES } as const;
export type ProviderType = MessageProviderType | LLMProviderType;

export function isMessageProvider(type: string): type is MessageProviderType {
  return Object.values(MESSAGE_PROVIDER_TYPES).includes(type as MessageProviderType);
}

export function isLLMProvider(type: string): type is LLMProviderType {
  return Object.values(LLM_PROVIDER_TYPES).includes(type as LLMProviderType);
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  category: PersonaCategory;
  traits: PersonaTrait[];
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
}

export const PERSONA_CATEGORIES = {
  PROFESSIONAL: 'professional',
  CREATIVE: 'creative',
  TECHNICAL: 'technical',
  CASUAL: 'casual',
  EDUCATIONAL: 'educational',
  ENTERTAINMENT: 'entertainment'
} as const;

export type PersonaCategory = typeof PERSONA_CATEGORIES[keyof typeof PERSONA_CATEGORIES];

export interface PersonaTrait {
  name: string;
  value: string;
  weight: number;
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
  providerType: ProviderType | 'message' | 'llm';
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
  mcpServers?: string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  isActive: boolean;
  envOverrides?: Record<string, any>;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotRequest {
  name: string;
  messageProvider: string;
  llmProvider?: string;
  llmProfile?: string;
  responseProfile?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  isActive: boolean;
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
}

export const MESSAGE_PROVIDER_CONFIGS = {
  slack: {
    type: MESSAGE_PROVIDER_TYPES.SLACK,
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
    type: MESSAGE_PROVIDER_TYPES.DISCORD,
    displayName: 'Discord',
    description: 'Connect to Discord servers',
    icon: '🎮',
    fields: [
      { name: 'token', label: 'Bot Token', type: 'password', required: true },
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    ],
  },
  webhook: {
    type: MESSAGE_PROVIDER_TYPES.WEBHOOK,
    displayName: 'Webhook',
    description: 'Generic webhook integration',
    icon: '🔗',
    fields: [
      { name: 'url', label: 'Webhook URL', type: 'text', required: true },
      { name: 'secret', label: 'Secret', type: 'password', required: false },
    ],
  },
  mattermost: {
    type: MESSAGE_PROVIDER_TYPES.MATTERMOST,
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
    type: LLM_PROVIDER_TYPES.OPENAI,
    displayName: 'OpenAI',
    description: 'GPT models from OpenAI',
    icon: '🤖',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Default Model', type: 'text', required: false, placeholder: 'gpt-4o' },
    ],
  },
  flowise: {
    type: LLM_PROVIDER_TYPES.FLOWISE,
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
    type: LLM_PROVIDER_TYPES.PERPLEXITY,
    displayName: 'Perplexity',
    description: 'Search-augmented AI models',
    icon: '🔍',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Model', type: 'text', required: false },
    ],
  },
  replicate: {
    type: LLM_PROVIDER_TYPES.REPLICATE,
    displayName: 'Replicate',
    description: 'Run open-source models',
    icon: '🚀',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Model', type: 'text', required: false },
    ],
  },
  n8n: {
    type: LLM_PROVIDER_TYPES.N8N,
    displayName: 'n8n',
    description: 'Workflow automation platform',
    icon: '⚡',
    fields: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true },
      { name: 'authHeader', label: 'Auth Header', type: 'password', required: false },
    ],
  },
  openswarm: {
    type: LLM_PROVIDER_TYPES.OPENSWARM,
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
  category: PERSONA_CATEGORIES.PROFESSIONAL,
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
    category: PERSONA_CATEGORIES.PROFESSIONAL,
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
    category: PERSONA_CATEGORIES.TECHNICAL,
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
    category: PERSONA_CATEGORIES.CREATIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface PersonaModalState {
  isOpen: boolean;
  persona?: Persona;
  mode: 'create' | 'edit';
}
