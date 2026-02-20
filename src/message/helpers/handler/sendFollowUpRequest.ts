import { getTaskLlm } from '@src/llm/taskLlmRouter';
import Debug from 'debug';
import type { IMessage } from '@message/interfaces/IMessage';
import discordConfig from '@config/discordConfig';

const debug = Debug('app:sendFollowUpRequest');

import type { IMessageProvider } from '@message/interfaces/IMessageProvider';

/**
 * Sends an AI-generated follow-up message using chat completions.
 * @param msg - The message to follow up on.
 * @param channelId - The channel where the follow-up should be sent.
 * @param followUpText - The follow-up text to send.
 * @param messageProvider - The provider to use for sending the message.
 */
export async function sendFollowUpRequest(
  msg: IMessage,
  channelId: string,
  followUpText: string,
  messageProvider: IMessageProvider,
  senderKey?: string,
): Promise<void> {
  const { provider, metadata } = await getTaskLlm('followup', { baseMetadata: msg.metadata || {} });
  if (!provider.supportsChatCompletion()) {
    debug(`LLM provider does not support chat completions for channel: ${channelId}`);
    return;
  }

  const bonuses: Record<string, number> = discordConfig.get('DISCORD_CHANNEL_BONUSES') || {};
  const globalModifier = discordConfig.get('DISCORD_UNSOLICITED_CHANCE_MODIFIER') || 1.0;
  const bonus = bonuses[channelId] ?? globalModifier;
  const baseChance = 0.1;
  const finalChance = baseChance * bonus;

  if (Math.random() >= finalChance) {
    debug(`Skipped follow-up due to chance limit (finalChance: ${finalChance})`);
    return;
  }

  const historyMessages = [msg];
  debug(`Using LLM provider for follow-up in channel: ${channelId}`);

  try {
    const response = await provider.generateChatCompletion(followUpText, historyMessages, metadata);
    const followUpMessage = followUpText + ' ' + response;
    debug('Sending follow-up message:', followUpMessage);

    await messageProvider.sendMessageToChannel(channelId, followUpMessage, senderKey);
  } catch (error) {
    debug('Error generating follow-up:', error);
  }
}
