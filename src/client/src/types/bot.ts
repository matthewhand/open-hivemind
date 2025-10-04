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