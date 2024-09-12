import { getLlmProvider } from '@src/message/management/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import { Client } from 'discord.js';

const debug = Debug('app:sendFollowUpRequest');

/**
 * Sends an AI-generated follow-up message using completions (not chat completions).
 * @param {Client} client - The messaging service interface.
 * @param {IMessage} msg - The message to follow up on.
 * @param {string} channelId - The channel where the follow-up should be sent.
 * @param {string} followUpText - The follow-up text to send.
 */
export async function sendFollowUpRequest(
  client: Client,
  msg: IMessage,
  channelId: string,
  followUpText: string
): Promise<void> {
  const llmProvider = getLlmProvider(channelId);

  // Guard: Ensure the provider supports completions (not chat completions)
  if (!llmProvider.supportsCompletion()) {
    debug(`[sendFollowUpRequest] LLM provider does not support completions for channel: ${channelId}.`);
    return;
  }

  const historyMessages = [msg];
  debug(`[sendFollowUpRequest] Using LLM provider for follow-up in channel: ${channelId}`);

  try {
    const response = await llmProvider.generateCompletion(followUpText);
    const followUpMessage = followUpText + ' ' + response;
    debug('[sendFollowUpRequest] Sending follow-up message:', followUpMessage);  // Improvement: Debug log

    // Fix: Use Client to send the message
    await sendMessageToChannel(client, channelId, followUpMessage);
  } catch (error) {
    debug('[sendFollowUpRequest] Error generating follow-up:', error);
  }
}
