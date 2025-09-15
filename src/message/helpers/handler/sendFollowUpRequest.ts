import { getLlmProvider } from '@src/llm/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';
import discordConfig from '@config/discordConfig';

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
  const llmProvider = getLlmProvider();
  if (!llmProvider.length) {
    debug('No LLM providers available');
    return;
  }

  if (!llmProvider[0].supportsChatCompletion()) {
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
    const response = await llmProvider[0].generateChatCompletion(followUpText, historyMessages, msg.metadata);
    const followUpMessage = followUpText + ' ' + response;
    debug('Sending follow-up message:', followUpMessage);
    // In a real implementation, we would send the message to the channel here
    // For now, we're just logging it as the actual sending mechanism would depend on the platform
    // Example: await sendMessageToChannel(channelId, followUpMessage);
  } catch (error) {
    debug('Error generating follow-up:', error);
  }
}
