import { ILlmProvider } from "@src/llm/interfaces/ILlmProvider";
import { IMessage } from "@src/message/interfaces/IMessage";
import { FlowiseClient } from 'flowise-sdk';
import { getFlowiseResponseFallback } from './flowiseFallbackClient';
import Debug from "debug";
import flowiseConfig from "@integrations/flowise/interfaces/flowiseConfig";

const debug = Debug("app:flowiseProvider");
const flowise = new FlowiseClient({ baseUrl: flowiseConfig.get('FLOWISE_API_ENDPOINT') });

/**
 * Flowise provider implementation.
 * This provider supports both chat completions and single-turn completions.
 */
export const flowiseProvider: ILlmProvider = {
  supportsChatCompletion: () => true,
  supportsCompletion: () => true,

  /**
   * Generates a chat-based completion using the Flowise SDK.
   * Optionally falls back to HTTP if enabled via the environment.
   * @param {IMessage[]} historyMessages - The message history to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateChatCompletion: async (historyMessages: IMessage[]): Promise<string> => {
    const userMessage = historyMessages.length > 0 ? historyMessages[historyMessages.length - 1].getText() : 'No message content';
    const channelId = historyMessages.length > 0 ? historyMessages[0].getChannelId() : 'default-channel';

    try {
      // Primary Strategy: Use Flowise SDK
      debug('Using Flowise SDK for chat completion');
      const completion = await flowise.createPrediction({ chatflowId: flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID'), question: userMessage });
      let responseText = '';
      completion.on('data', (chunk: { text: string }) => {
        responseText += chunk.text;
      });
      return responseText;
    } catch (sdkError) {
      debug('Flowise SDK failed:', sdkError);
      if (process.env.FLOWISE_ENABLE_FALLBACK === 'true') {
        debug('Fallback enabled. Attempting HTTP fallback.');
        try {
          const fallbackResponse = await getFlowiseResponseFallback(channelId, userMessage);
          debug('Generated response from Flowise HTTP fallback:', fallbackResponse);
          return fallbackResponse;
        } catch (httpError) {
          debug('HTTP fallback failed:', httpError);
        }
      }
      throw new Error('Flowise SDK and fallback both failed.');
    }
  },

  /**
   * Generates a non-chat (single-turn) completion using the Flowise SDK.
   * Falls back to HTTP if enabled.
   * @param {string} prompt - The prompt to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating single-turn completion from Flowise with prompt:', prompt);

    try {
      // Primary Strategy: Use Flowise SDK
      const completion = await flowise.createPrediction({ chatflowId: flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID'), question: prompt });
      let responseText = '';
      completion.on('data', (chunk: { text: string }) => {
        responseText += chunk.text;
      });
      return responseText;
    } catch (sdkError) {
      debug('Flowise SDK failed for single-turn completion:', sdkError);
      if (process.env.FLOWISE_ENABLE_FALLBACK === 'true') {
        debug('Fallback enabled for single-turn completion. Attempting HTTP fallback.');
        try {
          const fallbackResponse = await getFlowiseResponseFallback('default-channel', prompt);
          debug('Generated response from Flowise HTTP fallback for single-turn:', fallbackResponse);
          return fallbackResponse;
        } catch (httpError) {
          debug('HTTP fallback for single-turn completion failed:', httpError);
        }
      }
      throw new Error('Flowise SDK and fallback both failed for single-turn completion.');
    }
  }
};
