import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import { OpenAI } from 'openai';
import openaiConfig from '@config/openaiConfig';
import Debug from 'debug';
import {
  BaseHivemindError,
  ConfigurationError,
  NetworkError,
  ApiError,
  TimeoutError,
} from '@src/types/errorClasses';

const debug = Debug('app:openAiProvider');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export class OpenAiProvider implements ILlmProvider {
  name = 'openai';
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
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
    metadata?: Record<string, any>,
  ): Promise<string> {
    debug('Starting chat completion generation');

    // Load configuration - prioritize env vars for critical settings
    debug('this.config:', JSON.stringify(this.config, null, 2));
    debug('process.env.OPENAI_MODEL:', process.env.OPENAI_MODEL);
    const apiKey = this.config.apiKey || openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    let baseURL = this.config.baseUrl || openaiConfig.get('OPENAI_BASE_URL') || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
    const timeout = this.config.timeout || openaiConfig.get('OPENAI_TIMEOUT') || 10000;
    const organization = this.config.organization || openaiConfig.get('OPENAI_ORGANIZATION') || undefined;
    const model =
      metadata?.modelOverride ||
      metadata?.model ||
      this.config.model ||
      process.env.OPENAI_MODEL ||
      openaiConfig.get('OPENAI_MODEL') ||
      'gpt-4o';

    const systemPrompt = metadata?.systemPrompt || this.config.systemPrompt || openaiConfig.get('OPENAI_SYSTEM_PROMPT') || 'You are a helpful assistant.';

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

    // Validate baseURL
    try {
      new URL(baseURL);
    } catch {
      baseURL = DEFAULT_BASE_URL;
    }

    const openai = new OpenAI({ apiKey, baseURL, timeout, organization });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.getText() || '',
      })),
      { role: 'user' as const, content: userMessage },
    ];

    // Retry loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Apply temperature boost from metadata if present (for duplicate retries)
        const baseTemperature = this.config.temperature || openaiConfig.get('OPENAI_TEMPERATURE') || 0.7;
        const temperatureBoost = metadata?.temperatureBoost || 0;
        const effectiveTemperature = Math.min(1.5, baseTemperature + temperatureBoost); // Cap at 1.5
        if (temperatureBoost > 0) {
          debug(`Applying temperature boost: ${baseTemperature} + ${temperatureBoost} = ${effectiveTemperature}`);
        }

        // Apply max tokens override from metadata (for spam prevention)
        const maxTokens = metadata?.maxTokensOverride || this.config.maxTokens || openaiConfig.get('OPENAI_MAX_TOKENS') || 150;

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
  }

  async generateCompletion(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey || openaiConfig.get('OPENAI_API_KEY');
    let baseURL = this.config.baseUrl || openaiConfig.get('OPENAI_BASE_URL') || DEFAULT_BASE_URL;
    const model = this.config.model || openaiConfig.get('OPENAI_MODEL') || 'gpt-4o'; // Text models like gpt-3.5-turbo-instruct?

    const openai = new OpenAI({ apiKey, baseURL });

    // Simplification: Not full logic recreation for brevity as this path is rarely used
    // But maintaining minimal functionality
    try {
      const response = await openai.completions.create({
        model,
        prompt,
        max_tokens: 150,
      });
      return response.choices[0]?.text || '';
    } catch (e) {
      console.error(e);
      return '';
    }
  }

  private handleError(error: unknown, attempt: number) {
    debug(`Attempt ${attempt} failed: ${error}`);
  }
}

// Export default singleton for backward compat imports
export const openAiProvider = new OpenAiProvider();
