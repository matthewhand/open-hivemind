import Debug from 'debug';
import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { openAiProvider } from '@integrations/openai/openAiProvider';
import flowiseProvider from '@integrations/flowise/flowiseProvider';
import * as openWebUIImport from '@integrations/openwebui/runInference';
import llmConfig from '@config/llmConfig';

const debug = Debug('app:getLlmProvider');

/**
 * OpenWebUI provider adapter that wraps the OpenWebUI inference module
 * to conform to the ILlmProvider interface standard.
 *
 * IMPORTANT: This provider only supports chat completions, not text completions.
 * Use this when you want to connect to a local OpenWebUI instance instead of cloud services.
 *
 * @example
 * ```typescript
 * // This provider will be automatically included when LLM_PROVIDER includes 'openwebui'
 * const providers = getLlmProvider(); // Returns [openAiProvider, openWebUI] if configured
 * ```
 */
const openWebUI: ILlmProvider = {
  supportsChatCompletion: () => true,
  supportsCompletion: () => false,
  generateChatCompletion: async (userMessage: string, historyMessages: IMessage[], metadata?: Record<string, any>) => {
    // Check if openWebUI supports metadata by inspecting parameter count
    if (openWebUIImport.generateChatCompletion.length === 3) {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages, metadata);
      return result.text || '';
    } else {
      const result = await openWebUIImport.generateChatCompletion(userMessage, historyMessages);
      return result.text || '';
    }
  },
  generateCompletion: async (prompt: string) => {
    throw new Error('Non-chat completion not supported by OpenWebUI');
  },
};

/**
 * Factory function that returns configured LLM providers based on environment configuration.
 *
 * USAGE PATTERNS:
 * - Single provider: LLM_PROVIDER=openai
 * - Multiple providers: LLM_PROVIDER=openai,flowise,openwebui
 * - Array format: LLM_PROVIDER=["openai","flowise"]
 *
 * PROVIDER DETAILS:
 * - openai: Full-featured OpenAI provider (chat + text completions)
 * - flowise: Flowise integration (chat completions only, requires channelId in metadata)
 * - openwebui: Local OpenWebUI instance (chat completions only)
 *
 * @returns {ILlmProvider[]} Array of initialized LLM providers in configured order
 * @throws {Error} If no valid providers are configured or all providers fail to initialize
 *
 * @example
 * ```typescript
 * // Basic usage
 * const providers = getLlmProvider();
 * const response = await providers[0].generateChatCompletion("Hello", [], {});
 *
 * // Multi-provider setup
 * process.env.LLM_PROVIDER = "openai,flowise";
 * const [openai, flowise] = getLlmProvider();
 *
 * // Fallback handling
 * try {
 *   const providers = getLlmProvider();
 *   if (providers.length === 0) throw new Error("No providers available");
 * } catch (error) {
 *   console.error("LLM configuration error:", error.message);
 * }
 * ```
 */
export function getLlmProvider(): ILlmProvider[] {
  const rawProvider = llmConfig.get('LLM_PROVIDER') as unknown;
  const providers = (typeof rawProvider === 'string'
    ? rawProvider.split(',').map((v: string) => v.trim())
    : Array.isArray(rawProvider)
      ? rawProvider
      : ['openai']) as string[];

  debug(`Configured LLM providers: ${providers.join(', ')}`);
  const llmProviders: ILlmProvider[] = [];

  providers.forEach((provider) => {
    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          llmProviders.push(openAiProvider);
          debug('Initialized OpenAI provider');
          break;
        case 'flowise':
          llmProviders.push(flowiseProvider);
          debug('Initialized Flowise provider');
          break;
        case 'openwebui':
          llmProviders.push(openWebUI);
          debug('Initialized OpenWebUI provider');
          break;
        default:
          debug(`Unknown LLM provider: ${provider}, skipping`);
      }
    } catch (error) {
      debug(`Failed to initialize provider ${provider}: ${error}`);
    }
  });

  if (llmProviders.length === 0) {
    throw new Error('No valid LLM providers initialized');
  }

  return llmProviders;
}
