import Debug from 'debug';
import { OpenAI } from 'openai';
import { isSafeUrl } from '@hivemind/shared-types';
import type { OpenAIConfig } from '@src/types/config';
import {
  ApiError,
  BaseHivemindError,
  ConfigurationError,
  NetworkError,
  TimeoutError,
} from '@src/types/errorClasses';
import openaiConfig from '@config/openaiConfig';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import { getCircuitBreaker } from '@common/CircuitBreaker';

const debug = Debug('app:openAiProvider');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const circuitBreaker = getCircuitBreaker({
  name: 'openai',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
});

export class OpenAiProvider implements ILlmProvider {
  name = 'openai';
  private config: OpenAIConfig & {
    timeout?: number;
    organization?: string;
    temperature?: number;
    maxTokens?: number;
  };

  constructor(config?: OpenAIConfig & { timeout?: number; organization?: string; temperature?: number; maxTokens?: number }) {
    this.config = config || { apiKey: '' };
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  supportsCompletion(): boolean {
    return true;
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Starting chat completion generation');

    debug('this.config:', JSON.stringify(this.config, null, 2));
    debug('process.env.OPENAI_MODEL:', process.env.OPENAI_MODEL);
    const apiKey =
      this.config.apiKey || openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    let baseURL =
      this.config.baseUrl ||
      openaiConfig.get('OPENAI_BASE_URL') ||
      process.env.OPENAI_BASE_URL ||
      DEFAULT_BASE_URL;
    const timeout = this.config.timeout || openaiConfig.get('OPENAI_TIMEOUT') || 10000;
    const organization =
      this.config.organization || openaiConfig.get('OPENAI_ORGANIZATION') || undefined;
    const model =
      metadata?.modelOverride ||
      metadata?.model ||
      this.config.model ||
      process.env.OPENAI_MODEL ||
      openaiConfig.get('OPENAI_MODEL') ||
      'gpt-4o';

    const systemPrompt =
      metadata?.systemPrompt ||
      this.config.systemPrompt ||
      openaiConfig.get('OPENAI_SYSTEM_PROMPT') ||
      'You are a helpful assistant.';

    debug('OpenAI Config:', {
      baseURL,
      model,
      apiKeyPresent: !!apiKey,
      organization,
      systemPrompt,
    });

    if (!apiKey) {
      throw new ConfigurationError('OpenAI API key is missing', 'OPENAI_API_KEY_MISSING');
    }

    try {
      new URL(baseURL);
      if (baseURL !== DEFAULT_BASE_URL && !(await isSafeUrl(baseURL))) {
        throw new Error('Unsafe URL');
      }
    } catch {
      baseURL = DEFAULT_BASE_URL;
    }

    const openai = new OpenAI({ apiKey, baseURL, timeout, organization });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.getText() || '',
      })),
      { role: 'user' as const, content: userMessage },
    ];

    return circuitBreaker.execute(async () => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const baseTemperature =
            this.config.temperature || openaiConfig.get('OPENAI_TEMPERATURE') || 0.7;
          const temperatureBoost = metadata?.temperatureBoost || 0;
          const effectiveTemperature = Math.min(1.5, baseTemperature + temperatureBoost);
          if (temperatureBoost > 0) {
            debug(
              `Applying temperature boost: ${baseTemperature} + ${temperatureBoost} = ${effectiveTemperature}`
            );
          }

          const maxTokens =
            metadata?.maxTokensOverride ||
            this.config.maxTokens ||
            openaiConfig.get('OPENAI_MAX_TOKENS') ||
            150;

          const response = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            temperature: effectiveTemperature,
          });

          debug('OpenAI Response:', JSON.stringify(response, null, 2));
          const content = response.choices[0]?.message?.content;
          if (!content) {
            debug('LLM returned empty content, failing silently');
            return '';
          }
          return content;
        } catch (error: unknown) {
          this.handleError(error, attempt);
          if (attempt < MAX_RETRIES) {
            await delay(RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1));
            continue;
          }
          throw error;
        }
      }
      return 'An unexpected error occurred.';
    });
  }

  async generateCompletion(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey || openaiConfig.get('OPENAI_API_KEY');
    let baseURL = this.config.baseUrl || openaiConfig.get('OPENAI_BASE_URL') || DEFAULT_BASE_URL;
    const model = this.config.model || openaiConfig.get('OPENAI_MODEL') || 'gpt-4o';

    try {
      new URL(baseURL);
      if (baseURL !== DEFAULT_BASE_URL && !(await isSafeUrl(baseURL))) {
        throw new Error('Unsafe URL');
      }
    } catch {
      baseURL = DEFAULT_BASE_URL;
    }

    const openai = new OpenAI({ apiKey, baseURL });

    return circuitBreaker.execute(async () => {
      const response = await openai.completions.create({
        model,
        prompt,
        max_tokens: 150,
      });
      return response.choices[0]?.text || '';
    });
  }

  async validateCredentials(): Promise<boolean> {
    const apiKey =
      this.config.apiKey || openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    return !!apiKey;
  }

  async generateResponse(message: IMessage, context?: IMessage[]): Promise<string> {
    return this.generateChatCompletion(message.getText(), context || [], message.metadata);
  }

  private handleError(error: unknown, attempt: number) {
    debug(`Attempt ${attempt} failed: ${error}`);
  }
}

export const openAiProvider = new OpenAiProvider();
