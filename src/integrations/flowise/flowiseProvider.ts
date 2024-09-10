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
 * Supports both chat completions (with context) and single-turn completions.
 */
export const flowiseProvider: ILlmProvider = {
  supportsChatCompletion: () => true,
  supportsCompletion: () => true,

  /**
   * Generates a chat-based completion using the Flowise SDK.
   * If the SDK fails and fallback is enabled, attempts an HTTP-based fallback.
   * @param {IMessage[]} historyMessages - The message history to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateChatCompletion: async (historyMessages: IMessage[]): Promise<string> => {
    // Guard: Ensure historyMessages is non-empty and includes valid text
    if (!historyMessages || historyMessages.length === 0 || !historyMessages[historyMessages.length - 1].getText().trim()) {
      debug('No valid message content found in historyMessages. Exiting.');
      return 'No message content available.';
    }

    const userMessage = historyMessages[historyMessages.length - 1].getText();
    const channelId = historyMessages[0].getChannelId() || 'default-channel';

    try {
      // Primary Strategy: Use Flowise SDK
      debug('Using Flowise SDK for chat completion. chatflowId:', flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID'), 'userMessage:', userMessage);
      const completion = await flowise.createPrediction({ chatflowId: flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID'), question: userMessage });
      const responseText = completion?.text || 'No response received.';
      debug('Generated response from Flowise SDK:', responseText);
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
   * Generates a single-turn completion (no context) using the Flowise SDK.
   * Falls back to HTTP if the SDK fails and fallback is enabled.
   * @param {string} prompt - The user prompt to send to Flowise.
   * @returns {Promise<string>} The generated response from Flowise.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    // Guard: Ensure prompt is non-empty
    if (!prompt.trim()) {
      debug('No valid prompt provided. Exiting.');
      return 'Prompt is empty.';
    }

    debug('Generating single-turn completion from Flowise. chatflowId:', flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID'), 'prompt:', prompt);

    try {
      // Primary Strategy: Use Flowise SDK
      const completion = await flowise.createPrediction({ chatflowId: flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID'), question: prompt });
      const responseText = completion?.text || 'No response received.';
      debug('Generated response from Flowise SDK for single-turn:', responseText);
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
