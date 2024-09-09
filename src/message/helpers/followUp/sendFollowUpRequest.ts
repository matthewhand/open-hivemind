import { getLlmProvider } from '@src/message/management/getLlmProvider';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendCompletions } from '@src/llm/llm/generateCompletion';

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
  const provider = llmProvider instanceof Function ? 'openai' : 'flowise'; // Assuming OpenAI by default
  const historyMessages = [msg];

  try {
    debug(`[sendFollowUpRequest] Using provider: ${provider} for follow-up`);
    const response = await sendCompletions(historyMessages, provider);
    debug('[sendFollowUpRequest] Follow-up response generated:', response);

    // Simulate sending the follow-up response to the same channel
    await msg.reply(followUpText + ' ' + response);
  } catch (error) {
    debug('[sendFollowUpRequest] Error generating follow-up:', error);
  }
}
