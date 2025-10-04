export interface BotInstance {
  id: string;
  name: string;
  status: BotStatus;
  provider: MessageProvider | LLMProvider;
  persona?: Persona;
  createdAt: string;
  updatedAt: string;
  config: Record<string, any>;
}

export enum BotStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  STARTING = 'starting',
  STOPPING = 'stopping'
}

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

export enum MessageProviderType {
  SLACK = 'slack',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  MATTERMOST = 'mattermost'
}

export enum LLMProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  HUGGINGFACE = 'huggingface',
  LOCAL = 'local'
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

export enum PersonaCategory {
  PROFESSIONAL = 'professional',
  CREATIVE = 'creative',
  TECHNICAL = 'technical',
  CASUAL = 'casual',
  EDUCATIONAL = 'educational',
  ENTERTAINMENT = 'entertainment'
}

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
  providerType: MessageProviderType | LLMProviderType;
  provider?: MessageProvider | LLMProvider;
  mode: 'create' | 'edit';
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
  description?: string;
  instance: BotInstance;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotRequest {
  name: string;
  description?: string;
  providerId: string;
  personaId?: string;
  config: Record<string, any>;
}

export const MESSAGE_PROVIDER_CONFIGS = {
  slack: {
    type: MessageProviderType.SLACK,
    displayName: 'Slack',
    description: 'Connect to Slack workspaces',
    icon: '💬',
    fields: []
  },
  discord: {
    type: MessageProviderType.DISCORD,
    displayName: 'Discord',
    description: 'Connect to Discord servers',
    icon: '🎮',
    fields: []
  },
  telegram: {
    type: MessageProviderType.TELEGRAM,
    displayName: 'Telegram',
    description: 'Connect to Telegram groups',
    icon: '✈️',
    fields: []
  },
  webhook: {
    type: MessageProviderType.WEBHOOK,
    displayName: 'Webhook',
    description: 'Generic webhook integration',
    icon: '🔗',
    fields: []
  },
  mattermost: {
    type: MessageProviderType.MATTERMOST,
    displayName: 'Mattermost',
    description: 'Connect to Mattermost instances',
    icon: '💻',
    fields: []
  }
};

export const LLM_PROVIDER_CONFIGS = {
  openai: {
    type: LLMProviderType.OPENAI,
    displayName: 'OpenAI',
    description: 'GPT models from OpenAI',
    icon: '🤖',
    fields: []
  },
  anthropic: {
    type: LLMProviderType.ANTHROPIC,
    displayName: 'Anthropic',
    description: 'Claude models from Anthropic',
    icon: '🧠',
    fields: []
  },
  ollama: {
    type: LLMProviderType.OLLAMA,
    displayName: 'Ollama',
    description: 'Local models via Ollama',
    icon: '🦙',
    fields: []
  },
  huggingface: {
    type: LLMProviderType.HUGGINGFACE,
    displayName: 'Hugging Face',
    description: 'Models from Hugging Face',
    icon: '🤗',
    fields: []
  },
  local: {
    type: LLMProviderType.LOCAL,
    displayName: 'Local',
    description: 'Custom local models',
    icon: '🏠',
    fields: []
  }
};

export const DEFAULT_PERSONA: Persona = {
  id: 'default',
  name: 'Helpful Assistant',
  description: 'A friendly and helpful AI assistant',
  systemPrompt: 'You are a helpful assistant. Be polite, professional, and provide accurate information.',
  traits: [
    { name: 'Tone', value: 'Friendly', weight: 1 },
    { name: 'Style', value: 'Professional', weight: 1 }
  ],
  category: PersonaCategory.PROFESSIONAL,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};