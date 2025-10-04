// Bot Management Types

export type BotStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'available' | 'unavailable';

// Persona types
export type PersonaCategory = 'general' | 'customer_service' | 'creative' | 'technical' | 'educational' | 'entertainment' | 'professional';

export interface PersonaTrait {
  name: string;
  value: string;
  type: 'tone' | 'style' | 'behavior' | 'knowledge' | 'personality';
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  traits: PersonaTrait[];
  category: PersonaCategory;
  isBuiltIn: boolean;
  createdAt: string;
  usageCount: number;
}

// Default persona
export const DEFAULT_PERSONA: Persona = {
  id: 'default',
  name: 'Helpful Assistant',
  description: 'A friendly and helpful AI assistant',
  systemPrompt: 'You are a helpful assistant. Be polite, professional, and provide accurate information to the best of your ability.',
  traits: [
    { name: 'Tone', value: 'Friendly', type: 'tone' },
    { name: 'Style', value: 'Professional', type: 'style' },
    { name: 'Behavior', value: 'Helpful', type: 'behavior' }
  ],
  category: 'general',
  isBuiltIn: true,
  createdAt: new Date().toISOString(),
  usageCount: 0
};

// Enhanced base provider interface
export interface BaseProvider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;

  // Avatar and branding
  avatarUrl?: string;
  brandingColor?: string;
  iconUrl?: string;

  // Connection details
  config: Record<string, any>;
  credentials?: Record<string, string>;

  // Status and metadata
  status: ProviderStatus;
  lastTested?: string;
  connectedBots: string[];
  createdAt: string;
  updatedAt: string;

  // Provider-specific metadata
  metadata?: {
    accountId?: string;
    workspaceName?: string;
    serverName?: string;
    guildName?: string;
    channelCount?: number;
    userCount?: number;
  };
}

// Message provider types - kept generic for plugin architecture
export type MessageProviderType = string;

// LLM provider types - kept generic for plugin architecture
export type LLMProviderType = string;

export interface MessageProvider extends BaseProvider {
  type: MessageProviderType;
  botId?: string; // If connected to a specific bot
  channels?: string[]; // Connected channels for this provider
}

// LLM provider types
export type LLMProviderType = 'openai' | 'anthropic' | 'ollama' | 'huggingface' | 'custom';

export interface LLMProvider extends BaseProvider {
  type: LLMProviderType;
  model?: string;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
}

// Bot instance
export interface BotInstance {
  id: string;
  name: string;
  description?: string;
  status: BotStatus;
  personaId?: string;
  messageProviders: MessageProvider[];  // Multiple active connections
  llmProviders: LLMProvider[];          // Failover chain
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  error?: string;
}

// Provider configuration forms
export interface ProviderFormData {
  name: string;
  type: MessageProviderType | LLMProviderType;
  config: Record<string, any>;
}

// Modal state
export interface ProviderModalState {
  isOpen: boolean;
  botId?: string;
  providerType: 'message' | 'llm';
  provider?: MessageProvider | LLMProvider; // For editing
  isEdit: boolean;
}

// Provider type configurations
export interface ProviderTypeConfig {
  type: string;
  name: string;
  icon: string;
  requiredFields: FieldConfig[];
  optionalFields: FieldConfig[];
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'toggle';
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Message provider type configurations
export const MESSAGE_PROVIDER_CONFIGS: Record<MessageProviderType, ProviderTypeConfig> = {
  discord: {
    type: 'discord',
    name: 'Discord',
    icon: '💬',
    requiredFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'Enter Discord bot token',
        required: true
      },
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'text',
        placeholder: 'Enter Discord application client ID',
        required: true
      }
    ],
    optionalFields: [
      {
        key: 'serverIds',
        label: 'Server IDs (comma-separated)',
        type: 'text',
        placeholder: 'Enter server IDs'
      }
    ]
  },
  telegram: {
    type: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    requiredFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'Enter Telegram bot token',
        required: true
      }
    ],
    optionalFields: []
  },
  slack: {
    type: 'slack',
    name: 'Slack',
    icon: '📱',
    requiredFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'Enter Slack bot token',
        required: true
      },
      {
        key: 'signingSecret',
        label: 'Signing Secret',
        type: 'password',
        placeholder: 'Enter Slack signing secret',
        required: true
      }
    ],
    optionalFields: []
  },
  webhook: {
    type: 'webhook',
    name: 'Webhook',
    icon: '🔗',
    requiredFields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        type: 'text',
        placeholder: 'Enter webhook URL',
        required: true
      }
    ],
    optionalFields: [
      {
        key: 'secret',
        label: 'Secret Key',
        type: 'password',
        placeholder: 'Enter webhook secret'
      }
    ]
  }
};

// LLM provider type configurations
export const LLM_PROVIDER_CONFIGS: Record<LLMProviderType, ProviderTypeConfig> = {
  openai: {
    type: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    requiredFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter OpenAI API key',
        required: true
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
        required: true
      }
    ],
    optionalFields: [
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: '2048',
        validation: { min: 1, max: 8192 }
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        validation: { min: 0, max: 2 }
      },
      {
        key: 'organizationId',
        label: 'Organization ID',
        type: 'text',
        placeholder: 'Enter organization ID (optional)'
      }
    ]
  },
  anthropic: {
    type: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    requiredFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter Anthropic API key',
        required: true
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2'],
        required: true
      }
    ],
    optionalFields: [
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: '4096',
        validation: { min: 1, max: 8192 }
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        validation: { min: 0, max: 1 }
      }
    ]
  },
  ollama: {
    type: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    requiredFields: [
      {
        key: 'endpoint',
        label: 'Ollama Endpoint',
        type: 'text',
        placeholder: 'http://localhost:11434',
        required: true
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'llama2, codellama, mistral, etc.',
        required: true
      }
    ],
    optionalFields: [
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: '2048',
        validation: { min: 1, max: 8192 }
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        validation: { min: 0, max: 2 }
      }
    ]
  },
  huggingface: {
    type: 'huggingface',
    name: 'Hugging Face',
    icon: '🤗',
    requiredFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter Hugging Face API key',
        required: true
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'Enter model name (e.g., meta-llama/Llama-2-70b-chat-hf)',
        required: true
      }
    ],
    optionalFields: [
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: '2048',
        validation: { min: 1, max: 8192 }
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        validation: { min: 0, max: 2 }
      }
    ]
  },
  custom: {
    type: 'custom',
    name: 'Custom',
    icon: '⚙️',
    requiredFields: [
      {
        key: 'endpoint',
        label: 'API Endpoint',
        type: 'text',
        placeholder: 'Enter custom API endpoint',
        required: true
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter API key (if required)'
      }
    ],
    optionalFields: [
      {
        key: 'model',
        label: 'Model Name',
        type: 'text',
        placeholder: 'Enter model name'
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        placeholder: '2048',
        validation: { min: 1, max: 8192 }
      },
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        placeholder: '0.7',
        validation: { min: 0, max: 2 }
      }
    ]
  }
};

// Built-in personas
export const BUILTIN_PERSONAS: Persona[] = [
  DEFAULT_PERSONA,
  {
    id: 'customer_service',
    name: 'Customer Service Agent',
    description: 'Professional and empathetic customer service representative',
    systemPrompt: 'You are a customer service agent. Be polite, empathetic, and helpful. Listen carefully to customer concerns and provide clear solutions. Always maintain a professional tone and prioritize customer satisfaction.',
    traits: [
      { name: 'Tone', value: 'Professional', type: 'tone' },
      { name: 'Style', value: 'Empathetic', type: 'style' },
      { name: 'Behavior', value: 'Solution-oriented', type: 'behavior' }
    ],
    category: 'customer_service',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    usageCount: 0
  },
  {
    id: 'technical_support',
    name: 'Technical Support Specialist',
    description: 'Knowledgeable technical support expert',
    systemPrompt: 'You are a technical support specialist. Provide clear, step-by-step technical assistance. Ask relevant questions to diagnose issues and explain technical concepts in an understandable way.',
    traits: [
      { name: 'Tone', value: 'Analytical', type: 'tone' },
      { name: 'Style', value: 'Technical', type: 'style' },
      { name: 'Behavior', value: 'Problem-solving', type: 'behavior' }
    ],
    category: 'technical',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    usageCount: 0
  },
  {
    id: 'creative_writer',
    name: 'Creative Writer',
    description: 'Imaginative and artistic content creator',
    systemPrompt: 'You are a creative writer. Use vivid language, imaginative descriptions, and engaging storytelling. Be creative, original, and adapt your writing style to suit different genres and audiences.',
    traits: [
      { name: 'Tone', value: 'Creative', type: 'tone' },
      { name: 'Style', value: 'Artistic', type: 'style' },
      { name: 'Behavior', value: 'Imaginative', type: 'behavior' }
    ],
    category: 'creative',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    usageCount: 0
  },
  {
    id: 'tutor',
    name: 'Educational Tutor',
    description: 'Patient and encouraging educational guide',
    systemPrompt: 'You are an educational tutor. Be patient, encouraging, and adaptive to different learning styles. Break down complex topics into understandable parts and use examples to reinforce learning.',
    traits: [
      { name: 'Tone', value: 'Encouraging', type: 'tone' },
      { name: 'Style', value: 'Educational', type: 'style' },
      { name: 'Behavior', value: 'Adaptive', type: 'behavior' }
    ],
    category: 'educational',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    usageCount: 0
  }
];

// API response types
export interface CreateBotRequest {
  name: string;
  description?: string;
  personaId?: string;
  systemPrompt?: string;
}

export interface UpdateBotRequest {
  name?: string;
  description?: string;
  personaId?: string;
  systemPrompt?: string;
  status?: BotStatus;
}

export interface CreatePersonaRequest {
  name: string;
  description: string;
  systemPrompt: string;
  traits: PersonaTrait[];
  category: PersonaCategory;
}

export interface UpdatePersonaRequest {
  name?: string;
  description?: string;
  systemPrompt?: string;
  traits?: PersonaTrait[];
  category?: PersonaCategory;
}

export interface PersonaModalState {
  isOpen: boolean;
  persona?: Persona;
  isEdit: boolean;
}

export interface AddProviderRequest {
  botId: string;
  providerType: 'message' | 'llm';
  provider: Omit<MessageProvider | LLMProvider, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface RemoveProviderRequest {
  botId: string;
  providerId: string;
}

// Mock data generators
export const createMockBot = (overrides: Partial<BotInstance> = {}): BotInstance => ({
  id: `bot-${Date.now()}`,
  name: 'New Bot',
  status: 'stopped',
  messageProviders: [],
  llmProviders: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockMessageProvider = (overrides: Partial<MessageProvider> = {}): MessageProvider => ({
  id: `msg-${Date.now()}`,
  name: 'Discord',
  type: 'discord',
  config: {
    botToken: 'mock-token',
    clientId: 'mock-client-id'
  },
  status: 'disconnected',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockLLMProvider = (overrides: Partial<LLMProvider> = {}): LLMProvider => ({
  id: `llm-${Date.now()}`,
  name: 'OpenAI',
  type: 'openai',
  config: {
    apiKey: 'mock-api-key',
    model: 'gpt-4',
    maxTokens: 2048,
    temperature: 0.7
  },
  status: 'available',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});