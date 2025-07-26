import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { getFlowiseResponse } from '@integrations/flowise/flowiseRestClient';
import { getFlowiseSdkResponse } from '@integrations/flowise/flowiseSdkClient';
import flowiseConfig from '@config/flowiseConfig';
import Debug from 'debug';

const flowiseDebug = Debug('app:flowiseProvider');

/**
 * Flowise provider implementation for ILlmProvider interface.
 *
 * PURPOSE:
 * - Provides integration with Flowise AI platform
 * - Supports both REST API and SDK client modes
 * - Requires channelId in metadata for conversation context
 *
 * CONFIGURATION:
 * - FLOWISE_USE_REST: true/false - Use REST API vs SDK client
 * - FLOWISE_CONVERSATION_CHATFLOW_ID: Required when using SDK mode
 * - FLOWISE_BASE_URL: Flowise server URL
 *
 * USAGE PATTERNS:
 * - REST mode: Simpler setup, direct HTTP calls
 * - SDK mode: More features, requires chatflow configuration
 * - Channel-based: Uses Discord/Slack channel ID as conversation identifier
 *
 * IMPORTANT: This provider REQUIRES channelId in metadata for proper conversation tracking.
 *
 * @example
 * ```typescript
 * // REST mode configuration
 * process.env.FLOWISE_USE_REST = "true";
 * const response = await flowiseProvider.generateChatCompletion(
 *   "Hello",
 *   [],
 *   { channelId: "discord-123456789" }
 * );
 *
 * // SDK mode configuration
 * process.env.FLOWISE_USE_REST = "false";
 * process.env.FLOWISE_CONVERSATION_CHATFLOW_ID = "your-chatflow-id";
 * const response = await flowiseProvider.generateChatCompletion(
 *   "What's the weather?",
 *   historyMessages,
 *   { channelId: "slack-C123456789" }
 * );
 * ```
 */
class FlowiseProvider implements ILlmProvider {
  supportsCompletion(): boolean {
    return false; // This provider now focuses on chat completions.
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  /**
   * Generates chat completion using Flowise AI platform.
   *
   * @param userMessage - The user's message to process
   * @param historyMessages - Previous messages in the conversation (not used in Flowise)
   * @param metadata - MUST contain channelId for conversation context
   * @returns Promise resolving to the AI response text
   *
   * @throws Will return error message string instead of throwing
   *
   * @example
   * ```typescript
   * const response = await flowiseProvider.generateChatCompletion(
   *   "Hello, how can I help?",
   *   [],
   *   { channelId: "discord-123456789", userId: "user-987654" }
   * );
   * ```
   *
   * ERROR HANDLING:
   * - Returns user-friendly error messages instead of throwing
   * - Logs detailed errors via debug logging
   * - Handles missing channelId gracefully
   */
  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ): Promise<string> {
    const channelId = metadata?.channelId;
    if (!channelId) {
      flowiseDebug('Error: channelId is missing from metadata for Flowise request.');
      return 'Sorry, I am missing some context to respond. Please try again.';
    }

    try {
      flowiseDebug(`Sending request to Flowise for channel ${channelId}`);
      let response: string;
      if (flowiseConfig.get('FLOWISE_USE_REST')) {
        response = await getFlowiseResponse(channelId, userMessage);
      } else {
        const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
        if (!chatflowId) {
          throw new Error('FLOWISE_CONVERSATION_CHATFLOW_ID is not set.');
        }
        response = await getFlowiseSdkResponse(userMessage, chatflowId);
      }
      return response;
    } catch (error) {
      flowiseDebug('Error getting response from Flowise:', error);
      return 'There was an error communicating with the AI service.';
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    flowiseDebug('generateCompletion is not supported, redirecting to generateChatCompletion.');
    // Fallback to chat completion with a dummy channelId if necessary,
    // though this path should ideally not be taken.
    return this.generateChatCompletion(prompt, [], { channelId: 'default-completion' });
  }
}

export default new FlowiseProvider();
