/**
 * OpenAI API response types and interfaces
 *
 * Provides strongly-typed interfaces for OpenAI API responses
 * to replace 'any' usage in OpenAI integrations.
 */

// Base OpenAI API response structure
export interface OpenAIBaseResponse {
  object: string;
  created: number;
  id?: string;
}

// Chat Completion types
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIChatChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'null' | null;
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChatCompletionResponse extends OpenAIBaseResponse {
  object: 'chat.completion';
  model: string;
  choices: OpenAIChatChoice[];
  usage: OpenAIUsage;
}

// Models API types
export interface OpenAIModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  permission?: OpenAIModelPermission[];
  root?: string;
  parent?: string;
}

export interface OpenAIModelPermission {
  id: string;
  object: 'model_permission';
  created: number;
  allow_create_engine: boolean;
  allow_sampling: boolean;
  allow_logprobs: boolean;
  allow_search_indices: boolean;
  allow_view: boolean;
  allow_fine_tuning: boolean;
  organization: string;
  group?: string;
  is_blocking: boolean;
}

export interface OpenAIModelsListResponse extends OpenAIBaseResponse {
  object: 'list';
  data: OpenAIModel[];
}

// Completion API types (legacy)
export interface OpenAICompletionChoice {
  text: string;
  index: number;
  logprobs: any; // Can be null or complex object
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

export interface OpenAICompletionResponse extends OpenAIBaseResponse {
  object: 'text_completion';
  model: string;
  choices: OpenAICompletionChoice[];
  usage: OpenAIUsage;
}

// Error types
export interface OpenAIError {
  object: 'error';
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string | number;
  };
}

// Embeddings API types
export interface OpenAIEmbedding {
  object: 'embedding';
  embedding: number[];
  index: number;
}

export interface OpenAIEmbeddingsResponse extends OpenAIBaseResponse {
  object: 'list';
  data: OpenAIEmbedding[];
  model: string;
  usage: OpenAIUsage;
}

// Moderation API types
export interface OpenAIModerationCategory {
  sexual: boolean;
  'sexual/minors': boolean;
  'hate/threatening': boolean;
  'self-harm': boolean;
  'self-harm/intent': boolean;
  'self-harm/instructions': boolean;
  violence: boolean;
  'violence/graphic': boolean;
}

export interface OpenAIModerationResult {
  categories: OpenAIModerationCategory;
  category_scores: Record<keyof OpenAIModerationCategory, number>;
  flagged: boolean;
}

export interface OpenAIModerationResponse extends OpenAIBaseResponse {
  object: 'moderation';
  model: string;
  results: OpenAIModerationResult[];
}

// Image Generation API types
export interface OpenAIImageData {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

export interface OpenAIImageResponse extends OpenAIBaseResponse {
  object: 'image';
  created: number;
  data: OpenAIImageData[];
}

// Audio API types
export interface OpenAITranscriptionResponse extends OpenAIBaseResponse {
  object: 'transcription';
  text: string;
  language?: string;
  duration?: number;
  words?: OpenAIWord[];
}

export interface OpenAIWord {
  word: string;
  start: number;
  end: number;
}

export interface OpenAITranslationResponse extends OpenAIBaseResponse {
  object: 'translation';
  text: string;
  language?: string;
  duration?: number;
}

// File API types
export interface OpenAIFile {
  id: string;
  object: 'file';
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status?: 'uploaded' | 'processed' | 'error';
  status_details?: string;
}

export interface OpenAIFilesListResponse extends OpenAIBaseResponse {
  object: 'list';
  data: OpenAIFile[];
}

// Fine-tuning API types


// Assistant API types (beta)





export interface OpenAIAnnotation {
  type: 'file_citation' | 'file_path';
  text: string;
  file_citation?: {
    file_id: string;
    quote: string;
  };
  file_path?: {
    file_id: string;
  };
  start_index: number;
  end_index: number;
}


export interface OpenAIRequiredAction {
  type: 'submit_tool_outputs';
  submit_tool_outputs: {
    tool_calls: OpenAIToolCall[];
  };
}


// Custom response types for Open Hivemind
export interface OpenHivemindChatResponse {
  text: string;
  context_variables?: {
    active_agent_name?: string;
  };
  usage?: OpenAIUsage;
  model?: string;
}

// Union types for API responses
export type OpenAIResponse =
  | OpenAIChatCompletionResponse
  | OpenAICompletionResponse
  | OpenAIModelsListResponse
  | OpenAIEmbeddingsResponse
  | OpenAIModerationResponse
  | OpenAIImageResponse
  | OpenAITranscriptionResponse
  | OpenAITranslationResponse
  | OpenAIFilesListResponse
  | OpenAIError;

// Type guards



