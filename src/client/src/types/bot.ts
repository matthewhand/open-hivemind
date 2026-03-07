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

export const BotStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  STARTING: 'starting',
  STOPPING: 'stopping',
} as const;
export type BotStatus = typeof BotStatus[keyof typeof BotStatus];

export const MessageProviderType = {
  DISCORD: 'discord',
  SLACK: 'slack',
  MATTERMOST: 'mattermost',
  WEBHOOK: 'webhook',
} as const;
export type MessageProviderType = typeof MessageProviderType[keyof typeof MessageProviderType];

export const LLMProviderType = {
  OPENAI: 'openai',
  FLOWISE: 'flowise',
  OPENWEBUI: 'openwebui',
  PERPLEXITY: 'perplexity',
  REPLICATE: 'replicate',
  N8N: 'n8n',
  OPENSWARM: 'openswarm',
} as const;
export type LLMProviderType = typeof LLMProviderType[keyof typeof LLMProviderType];

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
  enabled: boolean;
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

export const PersonaCategory = {
  PROFESSIONAL: 'professional',
  CREATIVE: 'creative',
  TECHNICAL: 'technical',
  CASUAL: 'casual',
  EDUCATIONAL: 'educational',
  ENTERTAINMENT: 'entertainment',
} as const;
export type PersonaCategory = typeof PersonaCategory[keyof typeof PersonaCategory];

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
  type: 'text' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea' | 'url' | 'json';
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
    type: MessageProviderType.SLACK,
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
    type: MessageProviderType.DISCORD,
    displayName: 'Discord',
    description: 'Connect to Discord servers',
    icon: '🎮',
    fields: [
      { name: 'token', label: 'Bot Token', type: 'password', required: true },
      { name: 'clientId', label: 'Client ID', type: 'text', required: true },
    ],
  },
  webhook: {
    type: MessageProviderType.WEBHOOK,
    displayName: 'Webhook',
    description: 'Generic webhook integration',
    icon: '🔗',
    fields: [
      { name: 'url', label: 'Webhook URL', type: 'text', required: true },
      { name: 'secret', label: 'Secret', type: 'password', required: false },
    ],
  },
  mattermost: {
    type: MessageProviderType.MATTERMOST,
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
    type: LLMProviderType.OPENAI,
    displayName: 'OpenAI',
    description: 'GPT models from OpenAI',
    icon: '🤖',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'model', label: 'Default Model', type: 'text', required: false, placeholder: 'gpt-4o' },
    ],
  },
  flowise: {
    type: LLMProviderType.FLOWISE,
    displayName: 'Flowise',
    description: 'Visual LLM orchestration',
    icon: '🌊',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { name: 'chatflowId', label: 'Chatflow ID', type: 'text', required: true },
    ],
  },
  openwebui: {
    type: LLMProviderType.OPENWEBUI,
    displayName: 'OpenWebUI',
    description: 'Connect to OpenWebUI instances',
    icon: '🌐',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: true },
      { name: 'apiUrl', label: 'API URL', type: 'text', required: true },
    ],
  },
  openswarm: {
    type: LLMProviderType.OPENSWARM,
    displayName: 'OpenSwarm',
    description: 'Connect to OpenSwarm clusters',
    icon: '🐝',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', required: false },
      { name: 'baseUrl', label: 'API URL', type: 'text', required: false },
      { name: 'team', label: 'Team', type: 'text', required: false },
    ],
  },
  perplexity: {
    type: LLMProviderType.PERPLEXITY,
    displayName: 'Perplexity',
    description: 'Perplexity AI models',
    icon: '🔍',
    fields: [],
  },
  replicate: {
    type: LLMProviderType.REPLICATE,
    displayName: 'Replicate',
    description: 'Run machine learning models on Replicate',
    icon: '🚀',
    fields: [],
  },
  n8n: {
    type: LLMProviderType.N8N,
    displayName: 'n8n',
    description: 'Workflow automation with n8n',
    icon: '⚙️',
    fields: [],
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
  category: PersonaCategory.PROFESSIONAL,
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
    category: PersonaCategory.PROFESSIONAL,
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
    category: PersonaCategory.TECHNICAL,
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
    category: PersonaCategory.CREATIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface PersonaModalState {
  isOpen: boolean;
  persona?: Persona;
  mode: 'create' | 'edit';
}
