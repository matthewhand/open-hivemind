import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import { CircuitBreaker } from '@src/utils/circuitBreaker';
import openWebUIConfig from './openWebUIConfig';
import Debug from 'debug';

const debug = Debug('app:openWebUIProvider');

// Retry/backoff settings
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 250;

// Create axios instance with API URL and headers
const authHeader = openWebUIConfig.get('authHeader');
if (authHeader) {
  debug('Using configured Authorization header for OpenWebUI (redacted)');
}
const openWebUIClient = axios.create({
  baseURL: openWebUIConfig.get('apiUrl'),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': authHeader || 'Bearer ollama',
  },
});

const model = openWebUIConfig.get('model');
const breaker = new CircuitBreaker(
  Number(openWebUIConfig.get('breakerFailureThreshold')) || 5,
  Number(openWebUIConfig.get('breakerResetTimeoutMs')) || 10000
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function classifyError(err: unknown): { retryable: boolean; reason: string; status?: number } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    // Retry on rate limit (429) and transient 5xx
    if (status === 429 || (status && status >= 500)) {
      return { retryable: true, reason: `HTTP ${status}`, status };
    }
    // Retry on certain network errors
    const code = (err as any).code as string | undefined;
    if (code && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNABORTED'].includes(code)) {
      return { retryable: true, reason: code };
    }
    return { retryable: false, reason: `HTTP ${status ?? 'unknown'}`, status };
  }
  return { retryable: false, reason: 'non-axios-error' };
}

async function withRetry<T>(fn: () => Promise<T>, opName: string): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      attempt += 1;
      return await fn();
    } catch (err) {
      const cls = classifyError(err);
      const canRetry = attempt < MAX_RETRIES && cls.retryable;
      debug(`${opName} failed (attempt ${attempt}/${MAX_RETRIES})`, {
        reason: cls.reason,
        status: cls.status,
        retrying: canRetry,
      });
      if (!canRetry) {
        throw err instanceof Error ? err : new Error(String(err));
      }
      const jitter = Math.floor(Math.random() * 100);
      const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1) + jitter;
      await sleep(backoff);
    }
  }
}

async function execWithBreaker<T>(opName: string, fn: () => Promise<T>): Promise<T> {
  if (!breaker.canExecute()) {
    const err = new Error('OpenWebUI circuit breaker is open');
    debug(`${opName} blocked by circuit breaker`);
    throw err;
  }
  try {
    const result = await fn();
    breaker.onSuccess();
    return result;
  } catch (e) {
    breaker.onFailure();
    throw e;
  }
}

/**
 * Provides chat and non-chat completion functionality for OpenWebUI.
 */
export const openWebUIProvider: ILlmProvider = {
  supportsChatCompletion: (): boolean => true,
  supportsCompletion: (): boolean => true,

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[] = []
  ): Promise<string> {
    debug('Generating chat completion with OpenWebUI');

    const messages = [
      ...historyMessages.map(msg => ({ role: msg.role || 'user', content: msg.getText() })),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await execWithBreaker('openwebui.chat_completions', () =>
        withRetry(
          () => openWebUIClient.post('/chat/completions', { model, messages }),
          'openwebui.chat_completions'
        )
      );
      return (response as any).data.choices[0].message.content;
    } catch (error) {
      debug('Error generating chat completion:', formatError(error));
      throw new Error(`Chat completion failed: ${getErrorMessage(error)}`);
    }
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Generating non-chat completion with OpenWebUI');

    try {
      const response = await execWithBreaker('openwebui.completions', () =>
        withRetry(
          () => openWebUIClient.post('/completions', { model, prompt, max_tokens: 100 }),
          'openwebui.completions'
        )
      );
      return (response as any).data.choices[0].text;
    } catch (error) {
      debug('Error generating non-chat completion:', formatError(error));
      throw new Error(`Non-chat completion failed: ${getErrorMessage(error)}`);
    }
  },
};

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
function formatError(error: unknown): any {
  if (axios.isAxiosError(error)) {
    return error.response?.data || error.message;
  }
  return getErrorMessage(error);
}
