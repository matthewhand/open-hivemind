import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { OpenAI } from 'openai';
import openaiConfig from '@config/openaiConfig';
import Debug from 'debug';
import { retry, defaultShouldRetry } from '@src/utils/retry';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
const debug = Debug('app:openAiProvider');
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

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
export const openAiProvider: ILlmProvider = {
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
    const apiKey = openaiConfig.get('OPENAI_API_KEY');
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
    } catch (e) {
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

    const retries = Number(openaiConfig.get('OPENAI_MAX_RETRIES') ?? 3);
    const minDelayMs = 300;
    const maxDelayMs = 5000;

    const safeMessagesForLog = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? redactSensitiveInfo('content', m.content) : '[complex_content]'
    }));
    debug('Prepared request', { model, baseURL, messages: safeMessagesForLog });

    const call = async () => openai.chat.completions.create({
      model,
      messages,
      max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 150,
      temperature: openaiConfig.get('OPENAI_TEMPERATURE') || 0.7,
      frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY') || 0.1,
      presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY') || 0.05,
      top_p: openaiConfig.get('OPENAI_TOP_P') || 0.9,
      stop: openaiConfig.get('OPENAI_STOP') || null
    });

    const response = await retry(call, {
      retries,
      minDelayMs,
      maxDelayMs,
      jitter: 'full',
      shouldRetry: (err, attempt) => defaultShouldRetry(err, attempt),
      onRetry: (err, attempt, delayMs) => {
        try {
          const { incrementCounter } = require('@src/utils/metrics');
          incrementCounter('openai.chat.retry');
        } catch {}
        debug('OpenAI chat retry', { attempt, delayMs, status: err?.status || err?.response?.status });
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      debug('No content in response');
      return 'Sorry, I couldn’t generate a response.';
    }
    debug('Generated content length', { length: content.length });
    return content;
  },

  async generateCompletion(prompt: string): Promise<string> {
    debug('Starting non-chat completion generation');
    debug('Prompt:', prompt);

    const apiKey = openaiConfig.get('OPENAI_API_KEY');
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
    } catch (e) {
      debug(`Invalid baseURL '${baseURL}', falling back to '${DEFAULT_BASE_URL}'`);
      baseURL = DEFAULT_BASE_URL;
    }

    const openai = new OpenAI({ apiKey, baseURL, timeout, organization });
    debug('OpenAI client initialized with baseURL:', baseURL);

    const retries = Number(openaiConfig.get('OPENAI_MAX_RETRIES') ?? 3);
    const minDelayMs = 300;
    const maxDelayMs = 5000;

    const safePrompt = typeof prompt === 'string' ? redactSensitiveInfo('content', prompt) : '';
    debug('Prepared legacy completion request', { model, baseURL, promptPreview: safePrompt.substring(0, 40) });

    const call = async () => openai.completions.create({
      model,
      prompt,
      max_tokens: openaiConfig.get('OPENAI_MAX_TOKENS') || 150,
      temperature: openaiConfig.get('OPENAI_TEMPERATURE') || 0.7,
      frequency_penalty: openaiConfig.get('OPENAI_FREQUENCY_PENALTY') || 0.1,
      presence_penalty: openaiConfig.get('OPENAI_PRESENCE_PENALTY') || 0.05,
      top_p: openaiConfig.get('OPENAI_TOP_P') || 0.9,
      stop: openaiConfig.get('OPENAI_STOP') || null
    });

    const response = await retry(call, {
      retries,
      minDelayMs,
      maxDelayMs,
      jitter: 'full',
      shouldRetry: (err, attempt) => defaultShouldRetry(err, attempt),
      onRetry: (err, attempt, delayMs) => {
        try {
          const { incrementCounter } = require('@src/utils/metrics');
          incrementCounter('openai.legacy.retry');
        } catch {}
        debug('OpenAI legacy retry', { attempt, delayMs, status: err?.status || err?.response?.status });
      }
    });

    const text = response.choices[0]?.text;
    if (!text) {
      debug('No text in response');
      return 'Sorry, I couldn’t generate a response.';
    }
    debug('Generated text length', { length: text.length });
    return text;
  }
};
