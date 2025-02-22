import { getLlmProvider } from '@src/llm/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
// import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import { Client } from 'discord.js';
import discordConfig from '@integrations/discord/interfaces/discordConfig';

const debug = Debug('app:sendFollowUpRequest');

/**
 * Sends an AI-generated follow-up message using chat completions.
 * @param msg - The message to follow up on.
 * @param channelId - The channel where the follow-up should be sent.
 * @param followUpText - The follow-up text to send.
 */
export async function sendFollowUpRequest(
  msg: IMessage,
  channelId: string,
  followUpText: string
): Promise<void> {
  const llmProvider = getLlmProvider();  // No argument needed

  // Guard: Ensure the provider supports chat completions
  if (!llmProvider.supportsChatCompletion()) {
    debug(`[sendFollowUpRequest] LLM provider does not support chat completions for channel: ${channelId}.`);
    return;
  }

  const bonuses: Record<string, number> = discordConfig.get('DISCORD_CHANNEL_BONUSES') || {};
  const globalModifier = discordConfig.get('DISCORD_UNSOLICITED_CHANCE_MODIFIER') || 1.0;
  const bonus = bonuses[channelId] ?? globalModifier;
  const baseChance = 0.1; // Default chance
  const finalChance = baseChance * bonus;

  if (Math.random() >= finalChance) {
    debug(`[sendFollowUpRequest] Skipped follow-up due to chance limit (finalChance: ${finalChance}).`);
    return;
  }

  const historyMessages = [msg]; // Track message history if needed
  debug(`[sendFollowUpRequest] Using LLM provider for follow-up in channel: ${channelId}`);

  try {
    const response = await llmProvider.generateChatCompletion(followUpText, historyMessages);
    const followUpMessage = followUpText + ' ' + response;
    debug('TODO [sendFollowUpRequest] Sending follow-up message:', followUpMessage);

    // await sendMessageToChannel(channelId, followUpMessage);
  } catch (error) {
    debug('[sendFollowUpRequest] Error generating follow-up:', error);
  }
}
