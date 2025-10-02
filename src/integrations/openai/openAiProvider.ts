import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { OpenAI } from 'openai';
import openaiConfig from '@config/openaiConfig';
import Debug from 'debug';

const debug = Debug('app:openAiProvider');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000;

// Utility to delay with exponential backoff
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * OpenAI provider implementation that conforms to the ILlmProvider interface.
 *
 * PURPOSE:
 * - Provides full OpenAI API integration including both chat and text completions
 * - Handles configuration, retry logic, and error handling
 * - Supports custom base URLs for OpenAI-compatible APIs (like Ollama, LM Studio)
 *
 * CONFIGURATION:
 * - OPENAI_API_KEY: Required API key
 * - OPENAI_BASE_URL: Optional custom endpoint (defaults to https://api.openai.com/v1)
 * - OPENAI_MODEL: Model to use (defaults to gpt-4o)
 * - OPENAI_TIMEOUT: Request timeout in ms (defaults to 10000)
 *
 * USAGE PATTERNS:
 * - Direct usage: openAiProvider.generateChatCompletion(...)
 * - Via getLlmProvider(): Automatically included when LLM_PROVIDER includes 'openai'
 *
 * ERROR HANDLING:
 * - Automatic retry with exponential backoff (3 attempts)
 * - Graceful error messages for common issues (timeout, connection errors)
 * - Detailed debug logging for troubleshooting
 *
 * @example
 * ```typescript
 * // Basic usage
 * const response = await openAiProvider.generateChatCompletion(
 *   "Hello, how are you?",
 *   [],
 *   { channel: "general" }
 * );
 *
 * // With conversation history
 * const history = [new DiscordMessage(message1), new DiscordMessage(message2)];
 * const response = await openAiProvider.generateChatCompletion(
 *   "What's the weather like?",
 *   history,
 *   { channel: "weather", userId: "12345" }
 * );
 * ```
 */
export class OpenAiProvider implements ILlmProvider {
  name = 'openai';

  supportsChatCompletion(): boolean {
    debug('Checking chat completion support: true');
    return true;
  }
  
  supportsCompletion(): boolean {
    debug('Checking non-chat completion support: true');
    return true;
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ): Promise<string> {
    return openAiProvider.generateChatCompletion(userMessage, historyMessages, metadata);
  }

  async generateCompletion(prompt: string): Promise<string> {
    return openAiProvider.generateCompletion(prompt);
  }

  async generateStreamingChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    onChunk: (chunk: string) => void,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (openAiProvider.generateStreamingChatCompletion) {
      return openAiProvider.generateStreamingChatCompletion(
        userMessage,
        historyMessages,
        onChunk,
        metadata
      );
    }
    throw new Error('Streaming not supported by this provider instance');
  }
}

export const openAiProvider: ILlmProvider = {
  name: 'openai',
  supportsChatCompletion: (): boolean => {
    debug('Checking chat completion support: true');
    return true;
  },
  supportsCompletion: (): boolean => {
    debug('Checking non-chat completion support: true');
    return true;
  },

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Starting chat completion generation');
    debug('User message:', userMessage);
    debug('History messages:', JSON.stringify(historyMessages.map(m => ({ role: m.role, content: m.getText() }))));
    debug('Metadata:', JSON.stringify(metadata || {}));

    // Load configuration
    const apiKey = openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    let baseURL = openaiConfig.get('OPENAI_BASE_URL') || DEFAULT_BASE_URL;
    const timeout = openaiConfig.get('OPENAI_TIMEOUT') || 10000;
    const organization = openaiConfig.get('OPENAI_ORGANIZATION') || undefined;
    const model = openaiConfig.get('OPENAI_MODEL') || 'gpt-4o'; // Fallback only if unset

    if (!apiKey) {
      debug('No API key found in config or environment');
      throw new Error('OpenAI API key is missing');
    }
    debug('Loaded config:', {
      apiKey: apiKey.slice(0, 4) + '...',
      baseURL,
      timeout,
      organization: organization || 'none',
      model
    });

    // Validate baseURL
    try {
      new URL(baseURL);
    } catch {
      debug(`Invalid baseURL '${baseURL}', falling back to '${DEFAULT_BASE_URL}'`);
      baseURL = DEFAULT_BASE_URL;
    }

    const openai = new OpenAI({ apiKey, baseURL, timeout, organization });
    debug('OpenAI client initialized with baseURL:', baseURL);

    // Prepare messages
    let messages = [
      { role: 'system' as const, content: openaiConfig.get('OPENAI_SYSTEM_PROMPT') || 'You are a helpful assistant.' },
      ...historyMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.getText() || ''
      })),
      { role: 'user' as const, content: userMessage }
    ];

    if (metadata && metadata.messages && Array.isArray(metadata.messages)) {
      const toolRelatedMessages = metadata.messages.filter((msg: any) =>
        (msg.role === 'assistant' && msg.tool_calls) || msg.role === 'tool'
      );
      messages = [...toolRelatedMessages, ...messages];
    }
    debug('Final messages prepared:', JSON.stringify(messages));

    // Retry loop
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        debug(`Attempt ${attempt} of ${MAX_RETRIES} with model '${model}' at '${baseURL}'`);
        const response = await openai.chat.completions.create({
          model,
          messages,
          max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 150,
          temperature: openaiConfig.get('OPENAI_TEMPERATURE') || 0.7,
          frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY') || 0.1,
          presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY') || 0.05,
          top_p: openaiConfig.get('OPENAI_TOP_P') || 0.9,
          stop: openaiConfig.get('OPENAI_STOP') || null
        });

        debug('Raw API response:', JSON.stringify(response));
        const content = response.choices[0]?.message?.content;
        if (!content) {
          debug('No content in response');
          return 'Sorry, I couldn’t generate a response.';
        }
        debug('Generated content:', content);
        return content;

      } catch (error: any) {
        debug(`Attempt ${attempt} failed:`, error);

        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
            debug(`Retrying in ${delayMs}ms...`);
            await delay(delayMs);
            continue;
          }

          debug('Max retries reached');
          if (errorMsg.includes('connection') || errorMsg.includes('econnrefused')) {
            return 'Unable to connect to the service, please try again later.';
          }
          if (errorMsg.includes('timed out')) {
            return 'Request took too long, please try again.';
          }
          throw new Error(`Chat completion failed after ${MAX_RETRIES} attempts: ${error.message}`);
        }

        throw new Error(`Chat completion failed: ${String(error)}`);
      }
    }

    debug('Unexpected exit from retry loop');
    return 'An unexpected error occurred.';
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Starting non-chat completion generation');
    debug('Prompt:', prompt);

    const apiKey = openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    let baseURL = openaiConfig.get('OPENAI_BASE_URL') || DEFAULT_BASE_URL;
    const timeout = openaiConfig.get('OPENAI_TIMEOUT') || 10000;
    const organization = openaiConfig.get('OPENAI_ORGANIZATION') || undefined;
    const model = openaiConfig.get('OPENAI_MODEL') || 'gpt-4o';

    if (!apiKey) {
      debug('No API key found in config or environment');
      throw new Error('OpenAI API key is missing');
    }
    debug('Loaded config:', {
      apiKey: apiKey.slice(0, 4) + '...',
      baseURL,
      timeout,
      organization: organization || 'none',
      model
    });

    try {
      new URL(baseURL);
    } catch {
      debug(`Invalid baseURL '${baseURL}', falling back to '${DEFAULT_BASE_URL}'`);
      baseURL = DEFAULT_BASE_URL;
    }

    const openai = new OpenAI({ apiKey, baseURL, timeout, organization });
    debug('OpenAI client initialized with baseURL:', baseURL);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        debug(`Attempt ${attempt} of ${MAX_RETRIES} with model '${model}' at '${baseURL}'`);
        const response = await openai.completions.create({
          model,
          prompt,
          max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 150,
          temperature: openaiConfig.get('OPENAI_TEMPERATURE') || 0.7,
          frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY') || 0.1,
          presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY') || 0.05,
          top_p: openaiConfig.get('OPENAI_TOP_P') || 0.9,
          stop: openaiConfig.get('OPENAI_STOP') || null
        });

        debug('Raw API response:', JSON.stringify(response));
        const text = response.choices[0]?.text;
        if (!text) {
          debug('No text in response');
          return 'Sorry, I couldn’t generate a response.';
        }
        debug('Generated text:', text);
        return text;

      } catch (error: any) {
        debug(`Attempt ${attempt} failed:`, error);

        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
            debug(`Retrying in ${delayMs}ms...`);
            await delay(delayMs);
            continue;
          }

          debug('Max retries reached');
          if (errorMsg.includes('connection') || errorMsg.includes('econnrefused')) {
            return 'Unable to connect to the service, please try again later.';
          }
          if (errorMsg.includes('timed out')) {
            return 'Request took too long, please try again.';
          }
          throw new Error(`Non-chat completion failed after ${MAX_RETRIES} attempts: ${error.message}`);
        }

        throw new Error(`Non-chat completion failed: ${String(error)}`);
      }
    }

    debug('Unexpected exit from retry loop');
    return 'An unexpected error occurred.';
  },

  async generateStreamingChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    onChunk: (chunk: string) => void,
    metadata?: Record<string, any>
  ): Promise<string> {
    debug('Starting streaming chat completion generation');
    debug('User message:', userMessage);
    debug('History messages:', JSON.stringify(historyMessages.map(m => ({ role: m.role, content: m.getText() }))));
    debug('Metadata:', JSON.stringify(metadata || {}));
    const apiKey = openaiConfig.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is missing');
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: openaiConfig.get('OPENAI_BASE_URL') || DEFAULT_BASE_URL,
      timeout: openaiConfig.get('OPENAI_TIMEOUT') || 10000,
      organization: openaiConfig.get('OPENAI_ORGANIZATION') || undefined,
    });

    const messages = [
      { role: 'system' as const, content: openaiConfig.get('OPENAI_SYSTEM_PROMPT') || 'You are a helpful assistant.' },
      ...historyMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.getText() || '',
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const stream = await openai.chat.completions.create({
      model: openaiConfig.get('OPENAI_MODEL') || 'gpt-4o',
      messages,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }
    return fullResponse;
  },
};
