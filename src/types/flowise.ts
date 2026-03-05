/**
 * Flowise API Response Types
 *
 * This file contains TypeScript interfaces and types for Flowise API responses,
 * replacing 'any' usage in Flowise integrations.
 *
 * Based on analysis of:
 * - src/integrations/flowise/flowiseProvider.ts
 * - src/integrations/flowise/flowiseRestClient.ts
 * - src/integrations/flowise/flowiseSdkClient.ts
 */

// ============================================================================
// Core Flowise API Response Types
// ============================================================================

/**
 * Standard Flowise API prediction response structure
 */
export interface FlowisePredictionResponse {
  /** The AI-generated response text */
  text: string;
  /** Chat session ID for maintaining conversation context */
  chatId?: string;
  /** Additional metadata from the prediction */
  metadata?: Record<string, unknown>;
  /** Source documents or references used in the response */
  sourceDocuments?: FlowiseSourceDocument[];
  /** Execution time in milliseconds */
  executionTime?: number;
}

/**
 * Source document referenced in Flowise responses
 */
export interface FlowiseSourceDocument {
  /** Content of the source document */
  pageContent: string;
  /** Metadata about the document */
  metadata: {
    /** Source file or URL */
    source?: string;
    /** Page number or section */
    page?: number;
    /** Document type */
    type?: string;
    /** Additional document metadata */
    [key: string]: unknown;
  };
}

/**
 * Flowise REST API request payload
 */
export interface FlowiseRestRequest {
  /** User question or message */
  question: string;
  /** Optional chat session ID for conversation continuity */
  chatId?: string;
  /** Override configuration for the request */
  overrideConfig?: FlowiseOverrideConfig;
  /** Additional context or variables */
  variables?: Record<string, unknown>;
}

/**
 * Flowise SDK prediction request structure
 */
export interface FlowiseSdkRequest {
  /** Chatflow ID to execute */
  chatflowId: string;
  /** User question or message */
  question: string;
  /** Override configuration */
  overrideConfig?: FlowiseOverrideConfig;
  /** Whether to enable streaming responses */
  streaming?: boolean;
  /** Chat session ID */
  chatId?: string;
  /** Additional variables */
  variables?: Record<string, unknown>;
}

/**
 * Configuration override structure for Flowise requests
 */
export interface FlowiseOverrideConfig {
  /** API credentials */
  credentials?: {
    DefaultKey?: string;
    [credentialName: string]: string | undefined;
  };
  /** Node-specific configurations */
  nodes?: Record<string, Record<string, unknown>>;
  /** System configuration overrides */
  system?: Record<string, unknown>;
}

// ============================================================================
// Flowise SDK Response Types
// ============================================================================

/**
 * Flowise SDK completion response
 */
export interface FlowiseSdkCompletion {
  /** Generated response text */
  text?: string;
  /** Chat session ID */
  chatId?: string;
  /** Message ID */
  messageId?: string;
  /** Execution metadata */
  executionTime?: number;
  /** Source documents */
  sourceDocuments?: FlowiseSourceDocument[];
  /** Error information if request failed */
  error?: string;
}

/**
 * Flowise streaming response chunk
 */
export interface FlowiseStreamChunk {
  /** Chunk type indicator */
  event?: 'token' | 'sourceDocuments' | 'end';
  /** Chunk data */
  data?: string | FlowiseSourceDocument[];
}

// ============================================================================
// Flowise Configuration Types
// ============================================================================

/**
 * Flowise configuration structure
 */
export interface FlowiseConfig {
  /** Flowise API endpoint URL */
  FLOWISE_API_ENDPOINT?: string;
  /** API key for authentication */
  FLOWISE_API_KEY?: string;
  /** Default chatflow ID for conversations */
  FLOWISE_CONVERSATION_CHATFLOW_ID?: string;
  /** Whether to use REST API instead of SDK */
  FLOWISE_USE_REST?: boolean | string;
  /** Request timeout in milliseconds */
  FLOWISE_TIMEOUT?: number;
  /** Maximum retries for failed requests */
  FLOWISE_MAX_RETRIES?: number;
}

/**
 * Flowise session data stored per channel
 */
export interface FlowiseSession {
  /** Current chat session ID */
  chatId?: string;
  /** Last interaction timestamp */
  lastActivity?: number;
  /** Channel-specific configuration */
  config?: Partial<FlowiseConfig>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Flowise-specific error structure
 */
export interface FlowiseError {
  /** Error message */
  message: string;
  /** HTTP status code if applicable */
  status?: number;
  /** Error code from Flowise API */
  code?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Whether the error is retryable */
  retryable?: boolean;
}

/**
 * Flowise API error response
 */
export interface FlowiseApiError {
  /** Error message */
  error: string;
  /** HTTP status code */
  statusCode?: number;
  /** Error timestamp */
  timestamp?: string;
  /** Request path that caused the error */
  path?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Flowise prediction response
 */
export function isFlowisePredictionResponse(obj: unknown): obj is FlowisePredictionResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'text' in obj &&
    typeof (obj as FlowisePredictionResponse).text === 'string'
  );
}

/**
 * Type guard for Flowise SDK completion
 */
export function isFlowiseSdkCompletion(obj: unknown): obj is FlowiseSdkCompletion {
  return typeof obj === 'object' && obj !== null && ('text' in obj || 'error' in obj);
}

/**
 * Type guard for Flowise error
 */
export function isFlowiseError(obj: unknown): obj is FlowiseError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'message' in obj &&
    typeof (obj as FlowiseError).message === 'string'
  );
}

/**
 * Type guard for Flowise API error response
 */
export function isFlowiseApiError(obj: unknown): obj is FlowiseApiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as FlowiseApiError).error === 'string'
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Union type for all Flowise response types
 */
export type FlowiseResponse = FlowisePredictionResponse | FlowiseSdkCompletion | FlowiseApiError;

/**
 * Union type for all Flowise request types
 */
export type FlowiseRequest = FlowiseRestRequest | FlowiseSdkRequest;

/**
 * Flowise provider metadata structure
 */
export interface FlowiseProviderMetadata {
  /** Channel ID for conversation context */
  channelId: string;
  /** User ID who sent the message */
  userId?: string;
  /** Platform (discord, slack, etc.) */
  platform?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Flowise configuration values
 */
export const FLOWISE_DEFAULTS = {
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
  USE_REST: true,
} as const;

/**
 * Flowise error codes
 */
export const FLOWISE_ERROR_CODES = {
  MISSING_CONFIG: 'FLOWISE_MISSING_CONFIG',
  INVALID_RESPONSE: 'FLOWISE_INVALID_RESPONSE',
  API_ERROR: 'FLOWISE_API_ERROR',
  TIMEOUT: 'FLOWISE_TIMEOUT',
  NETWORK_ERROR: 'FLOWISE_NETWORK_ERROR',
} as const;

export type FlowiseErrorCode = (typeof FLOWISE_ERROR_CODES)[keyof typeof FLOWISE_ERROR_CODES];
