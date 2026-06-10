import Debug from 'debug';
import { http, isHttpError, type ILlmProvider, type IMessage } from '@hivemind/shared-types';
import openWebUIConfig from './openWebUIConfig';
import { getSessionKey } from './sessionManager';

const debug = Debug('app:openWebUIProvider');

/**
 * Per-bot configuration for the OpenWebUI provider.
 *
 * Every field is optional; unset fields fall back to the process-wide
 * convict config (`OPEN_WEBUI_*` env vars).
 */
export interface OpenWebUIProviderConfig {
  /** Per-bot API base URL; falls back to OPEN_WEBUI_API_URL. */
  apiUrl?: string;
  /** Full Authorization header value (e.g. "Bearer xyz"); wins over apiKey. */
  authHeader?: string;
  /** Per-bot API key (sent as a Bearer token); falls back to OPEN_WEBUI_API_KEY. */
  apiKey?: string;
  /** Per-bot chat model; falls back to OPEN_WEBUI_MODEL. */
  model?: string;
  /** Per-bot embedding model; falls back to OPEN_WEBUI_EMBEDDING_MODEL. */
  embeddingModel?: string;
}

/**
 * Maps an IMessage history entry to an OpenAI-compatible chat role.
 *
 * The bot's own messages (role "assistant" or `isFromBot()`) are preserved
 * as `assistant` turns and system turns pass through, so the model sees a
 * faithful conversation instead of every turn flattened to `user`.
 */
export function mapHistoryRole(msg: IMessage): 'user' | 'assistant' | 'system' {
  if (msg.role === 'assistant' || msg.role === 'system') {
    return msg.role;
  }
  try {
    if (typeof msg.isFromBot === 'function' && msg.isFromBot()) {
      return 'assistant';
    }
  } catch (error) {
    debug('isFromBot() threw while mapping history role; defaulting to "user":', error);
  }
  return 'user';
}

/**
 * Provides chat and non-chat completion functionality for OpenWebUI.
 * Supports both password-based and API key authentication, with optional
 * per-bot overrides for apiUrl / auth / model.
 */
export class OpenWebUIProvider implements ILlmProvider {
  name = 'openwebui';
  private config: OpenWebUIProviderConfig;

  constructor(config?: OpenWebUIProviderConfig) {
    this.config = config || {};
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  /**
   * Creates an HTTP client with proper authorization headers.
   *
   * Resolution order: per-bot authHeader → per-bot apiKey → global apiKey
   * (when authMethod is "apiKey") → password session key.
   */
  private async createClient() {
    const apiUrl = this.config.apiUrl || openWebUIConfig.get('apiUrl');

    if (this.config.authHeader) {
      return http.create(apiUrl, {
        'Content-Type': 'application/json',
        Authorization: this.config.authHeader,
      });
    }

    const authMethod = openWebUIConfig.get('authMethod');
    const apiKey =
      this.config.apiKey || (authMethod === 'apiKey' ? openWebUIConfig.get('apiKey') : '');
    if (apiKey) {
      return http.create(apiUrl, {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      });
    }

    // For password auth, we need to get the session key first
    const sessionKey = await getSessionKey();
    return http.create(apiUrl, {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionKey}`,
    });
  }

  private resolveModel(metadata?: Record<string, any>): string {
    return (
      metadata?.modelOverride ||
      metadata?.model ||
      this.config.model ||
      openWebUIConfig.get('model')
    );
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = [],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI:', { userMessage, historyMessages });

    const client = await this.createClient();
    const messages = [
      ...historyMessages.map((msg) => ({ role: mapHistoryRole(msg), content: msg.getText() })),
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const data = await client.post<{ choices: Array<{ message: { content: string } }> }>(
        '/chat/completions',
        { model: this.resolveModel(metadata), messages }
      );
      return data.choices[0].message.content;
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI:', { prompt });

    const client = await this.createClient();

    try {
      const data = await client.post<{ choices: Array<{ text: string }> }>('/completions', {
        model: this.resolveModel(),
        prompt,
        max_tokens: 100,
      });
      return data.choices[0].text;
    } catch (error) {
      debug('Error generating non-chat completion:', formatError(error));
      throw new Error(`Non-chat completion failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Generates an embedding vector for the given text using the OpenAI-compatible
   * `/embeddings` endpoint exposed by OpenWebUI / Ollama. The embedding model is
   * configurable via `OPEN_WEBUI_EMBEDDING_MODEL` so this provider can back
   * vector memory stores (e.g. PostgresMemoryProvider) without OpenAI.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    debug('Generating embedding with OpenWebUI:', { text });

    const client = await this.createClient();
    const embeddingModel = this.config.embeddingModel || openWebUIConfig.get('embeddingModel');

    try {
      const data = await client.post<{ data: Array<{ embedding: number[] }> }>('/embeddings', {
        model: embeddingModel,
        input: text,
      });
      const embedding = data.data?.[0]?.embedding;
      if (!Array.isArray(embedding)) {
        throw new Error('OpenWebUI embedding response did not include an embedding vector');
      }
      return embedding;
    } catch (error) {
      debug('Error generating embedding:', formatError(error));
      throw new Error(`Embedding generation failed: ${getErrorMessage(error)}`);
    }
  }
}

/**
 * Default provider instance backed entirely by the process-wide config.
 * Per-bot instances are created via the package `create()` factory.
 */
export const openWebUIProvider = new OpenWebUIProvider();

/**
 * Safely extracts the error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Formats the error for debugging purposes.
 */
function formatError(error: unknown): unknown {
  if (isHttpError(error)) {
    return error.data || error.message;
  }
  return getErrorMessage(error);
}
