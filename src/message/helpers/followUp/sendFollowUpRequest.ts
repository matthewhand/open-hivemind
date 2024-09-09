import { getLlmProvider } from '@src/message/management/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:sendFollowUpRequest');

/**
 * Sends an AI-generated follow-up message based on the conversation context.
 * @param {IMessage} msg - The message to follow up on.
 * @param {string} channelId - The channel where the follow-up should be sent.
 * @param {string} followUpText - The follow-up text to send.
 */
export async function sendFollowUpRequest(
  msg: IMessage,
  channelId: string,
  followUpText: string
): Promise<void> {
  const llmProvider = getLlmProvider(channelId);

  // Guard: Ensure the provider supports chat completions
  if (!llmProvider.supportsChatCompletion()) {
    debug(`[sendFollowUpRequest] LLM provider does not support chat completions for channel: ${channelId}.`);
    return;
  }

  const historyMessages = [msg];
  debug(`[sendFollowUpRequest] Using LLM provider for follow-up in channel: ${channelId}`);

  try {
    const response = await llmProvider.generateChatCompletion(historyMessages, followUpText);
    debug('[sendFollowUpRequest] Follow-up response generated:', response);

    // Send the follow-up response to the same channel
    await msg.reply(followUpText + ' ' + response);
  } catch (error) {
    debug('[sendFollowUpRequest] Error generating follow-up:', error);
  }
}
