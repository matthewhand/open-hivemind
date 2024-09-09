import { getFlowiseResponse } from '@integrations/flowise/flowiseClient';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Flowise provider to generate responses using session management.
 *
 * @param {string} userMessage - The latest user message.
 * @param {string} channelId - The ID of the channel or conversation.
 * @returns {Promise<string>} The generated response from Flowise.
 */
export async function getFlowiseProvider(userMessage: string, channelId: string): Promise<string> {
  // Only send the current message to Flowise (session history is managed internally)
  const response = await getFlowiseResponse(channelId, userMessage);
  return response;
}
