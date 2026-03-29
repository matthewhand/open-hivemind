/**
 * Static model definitions for LLM providers
 * This file contains curated lists of available models with metadata
 */

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  type: 'chat' | 'embedding' | 'both';
  contextWindow?: number;
  maxOutputTokens?: number;
  pricing?: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
  supportsStreaming?: boolean;
  deprecated?: boolean;
  releaseDate?: string;
}

export interface ProviderModels {
  [providerId: string]: ModelMetadata[];
}

/**
 * OpenAI Models
 */
export const OPENAI_MODELS: ModelMetadata[] = [
  // GPT-4o Series
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most advanced multimodal model, optimized for speed and intelligence',
    type: 'chat',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { input: 2.5, output: 10.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable small model for fast, lightweight tasks',
    type: 'chat',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { input: 0.15, output: 0.6 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4o-2024-11-20',
    name: 'GPT-4o (Nov 2024)',
    description: 'Latest GPT-4o snapshot with improved performance',
    type: 'chat',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { input: 2.5, output: 10.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4o-2024-08-06',
    name: 'GPT-4o (Aug 2024)',
    description: 'GPT-4o snapshot from August 2024',
    type: 'chat',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    pricing: { input: 2.5, output: 10.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },

  // GPT-4 Turbo Series
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Latest GPT-4 Turbo with vision and JSON mode',
    type: 'chat',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 10.0, output: 30.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo Preview',
    description: 'Preview of GPT-4 Turbo capabilities',
    type: 'chat',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    pricing: { input: 10.0, output: 30.0 },
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },

  // GPT-4 Series
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Most capable GPT-4 model for complex tasks',
    type: 'chat',
    contextWindow: 8192,
    maxOutputTokens: 8192,
    pricing: { input: 30.0, output: 60.0 },
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-4-32k',
    name: 'GPT-4 32K',
    description: 'GPT-4 with extended context window',
    type: 'chat',
    contextWindow: 32768,
    maxOutputTokens: 32768,
    pricing: { input: 60.0, output: 120.0 },
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },

  // GPT-3.5 Series
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast, cost-effective model for simple tasks',
    type: 'chat',
    contextWindow: 16385,
    maxOutputTokens: 4096,
    pricing: { input: 0.5, output: 1.5 },
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gpt-3.5-turbo-16k',
    name: 'GPT-3.5 Turbo 16K',
    description: 'GPT-3.5 with extended context',
    type: 'chat',
    contextWindow: 16385,
    maxOutputTokens: 16385,
    pricing: { input: 1.0, output: 2.0 },
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },

  // Embedding Models
  {
    id: 'text-embedding-3-large',
    name: 'Text Embedding 3 Large',
    description: 'Most powerful embedding model with 3072 dimensions',
    type: 'embedding',
    contextWindow: 8191,
    pricing: { input: 0.13, output: 0 },
  },
  {
    id: 'text-embedding-3-small',
    name: 'Text Embedding 3 Small',
    description: 'Fast and efficient embedding model with 1536 dimensions',
    type: 'embedding',
    contextWindow: 8191,
    pricing: { input: 0.02, output: 0 },
  },
  {
    id: 'text-embedding-ada-002',
    name: 'Ada Embedding v2',
    description: 'Legacy embedding model, still widely used',
    type: 'embedding',
    contextWindow: 8191,
    pricing: { input: 0.10, output: 0 },
  },
];

/**
 * Anthropic Models
 */
export const ANTHROPIC_MODELS: ModelMetadata[] = [
  // Claude 3.5 Series
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Most intelligent model with improved coding and analysis',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { input: 3.0, output: 15.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet (June 2024)',
    description: 'Previous Claude 3.5 Sonnet snapshot',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    pricing: { input: 3.0, output: 15.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },

  // Claude 3 Series
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Most powerful model for highly complex tasks',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { input: 15.0, output: 75.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    description: 'Balanced model for scaled deployments',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { input: 3.0, output: 15.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Fastest model for instant responsiveness',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { input: 0.25, output: 1.25 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },

  // Claude 2 Series (Legacy)
  {
    id: 'claude-2.1',
    name: 'Claude 2.1',
    description: 'Legacy model with 200K context (deprecated)',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    pricing: { input: 8.0, output: 24.0 },
    supportsStreaming: true,
    deprecated: true,
  },
  {
    id: 'claude-2.0',
    name: 'Claude 2.0',
    description: 'Legacy model (deprecated)',
    type: 'chat',
    contextWindow: 100000,
    maxOutputTokens: 4096,
    pricing: { input: 8.0, output: 24.0 },
    supportsStreaming: true,
    deprecated: true,
  },

  // Claude Instant (Legacy)
  {
    id: 'claude-instant-1.2',
    name: 'Claude Instant 1.2',
    description: 'Fast and affordable legacy model (deprecated)',
    type: 'chat',
    contextWindow: 100000,
    maxOutputTokens: 4096,
    pricing: { input: 0.8, output: 2.4 },
    supportsStreaming: true,
    deprecated: true,
  },
];

/**
 * Google (Gemini) Models
 */
export const GOOGLE_MODELS: ModelMetadata[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Experimental)',
    description: 'Next generation multimodal model with enhanced speed',
    type: 'chat',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Advanced reasoning with 2M context window',
    type: 'chat',
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    pricing: { input: 1.25, output: 5.0 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and versatile for high-frequency tasks',
    type: 'chat',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    pricing: { input: 0.075, output: 0.3 },
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro',
    description: 'Balanced model for text tasks',
    type: 'chat',
    contextWindow: 32760,
    maxOutputTokens: 8192,
    pricing: { input: 0.5, output: 1.5 },
    supportsFunctionCalling: true,
    supportsStreaming: true,
  },
  {
    id: 'text-embedding-004',
    name: 'Text Embedding 004',
    description: 'Latest text embedding model from Google',
    type: 'embedding',
    contextWindow: 2048,
    pricing: { input: 0.025, output: 0 },
  },
];

/**
 * Perplexity Models
 */
export const PERPLEXITY_MODELS: ModelMetadata[] = [
  {
    id: 'sonar-pro',
    name: 'Sonar Pro',
    description: 'Most powerful model with real-time search',
    type: 'chat',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
  },
  {
    id: 'sonar',
    name: 'Sonar',
    description: 'Fast model with search capabilities',
    type: 'chat',
    contextWindow: 127000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
  },
];

/**
 * Aggregated provider models
 */
export const LLM_MODELS_BY_PROVIDER: ProviderModels = {
  openai: OPENAI_MODELS,
  anthropic: ANTHROPIC_MODELS,
  google: GOOGLE_MODELS,
  perplexity: PERPLEXITY_MODELS,
};

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(providerId: string): ModelMetadata[] {
  const normalizedId = providerId.toLowerCase();
  return LLM_MODELS_BY_PROVIDER[normalizedId] || [];
}

/**
 * Get models by type
 */
export function getModelsByType(providerId: string, type: 'chat' | 'embedding' | 'both'): ModelMetadata[] {
  const models = getModelsForProvider(providerId);
  return models.filter(model => model.type === type || model.type === 'both');
}

/**
 * Get all chat models for a provider
 */
export function getChatModels(providerId: string): ModelMetadata[] {
  return getModelsByType(providerId, 'chat');
}

/**
 * Get all embedding models for a provider
 */
export function getEmbeddingModels(providerId: string): ModelMetadata[] {
  return getModelsByType(providerId, 'embedding');
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): string[] {
  return Object.keys(LLM_MODELS_BY_PROVIDER);
}
