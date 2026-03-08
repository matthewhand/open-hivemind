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
export interface OpenAIFineTuneEvent {
  object: 'fine_tune.event';
  created_at: number;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface OpenAIFineTune {
  id: string;
  object: 'fine_tune';
  created_at: number;
  updated_at: number;
  model: string;
  fine_tuned_model?: string;
  organization_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  hyperparams: Record<string, any>;
  training_files: OpenAIFile[];
  validation_files: OpenAIFile[];
  result_files: OpenAIFile[];
  events: OpenAIFineTuneEvent[];
}

// Assistant API types (beta)
export interface OpenAIAssistant {
  id: string;
  object: 'assistant';
  created_at: number;
  name?: string;
  description?: string;
  model: string;
  instructions?: string;
  tools: OpenAIAssistantTool[];
  file_ids: string[];
  metadata: Record<string, string>;
}

export interface OpenAIAssistantTool {
  type: 'code_interpreter' | 'retrieval' | 'function';
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

export interface OpenAIThread {
  id: string;
  object: 'thread';
  created_at: number;
  metadata: Record<string, string>;
}

export interface OpenAIThreadMessage extends OpenAIBaseResponse {
  object: 'thread.message';
  role: 'user' | 'assistant';
  content: OpenAIThreadMessageContent[];
  file_ids: string[];
  metadata: Record<string, string>;
}

export interface OpenAIThreadMessageContent {
  type: 'text' | 'image_file';
  text?: {
    value: string;
    annotations: OpenAIAnnotation[];
  };
  image_file?: {
    file_id: string;
  };
}

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

export interface OpenAIRun {
  id: string;
  object: 'thread.run';
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status:
    | 'queued'
    | 'in_progress'
    | 'requires_action'
    | 'cancelling'
    | 'cancelled'
    | 'failed'
    | 'completed'
    | 'expired';
  required_action?: OpenAIRequiredAction;
  last_error?: OpenAIRunError;
  expires_at: number;
  started_at?: number;
  completed_at?: number;
  cancelled_at?: number;
  failed_at?: number;
  model: string;
  instructions: string;
  tools: OpenAIAssistantTool[];
  file_ids: string[];
  metadata: Record<string, string>;
}

export interface OpenAIRequiredAction {
  type: 'submit_tool_outputs';
  submit_tool_outputs: {
    tool_calls: OpenAIToolCall[];
  };
}

export interface OpenAIRunError {
  code: string;
  message: string;
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
export function isOpenAIError(response: OpenAIResponse): response is OpenAIError {
  return 'error' in response;
}

export function isChatCompletionResponse(
  response: OpenAIResponse
): response is OpenAIChatCompletionResponse {
  return 'object' in response && response.object === 'chat.completion';
}

export function isModelsListResponse(
  response: OpenAIResponse
): response is OpenAIModelsListResponse {
  return (
    'object' in response &&
    response.object === 'list' &&
    'data' in response &&
    Array.isArray(response.data) &&
    response.data.length > 0 &&
    'id' in response.data[0]
  );
}

export function isCompletionResponse(
  response: OpenAIResponse
): response is OpenAICompletionResponse {
  return 'object' in response && response.object === 'text_completion';
}
