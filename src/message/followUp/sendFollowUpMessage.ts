import { Message } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:message:sendFollowUpMessage');

/**
 * Sends a follow-up message with the given content to the specified channel.
 * @param {Message} originalMessage - The original message that triggered the follow-up.
 * @param {string} content - The content of the follow-up message.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
export async function sendFollowUpMessage(
  originalMessage: Message,
  content: string
): Promise<void> {
  try {
    const channel = originalMessage.channel;
    await channel.send(content);
    debug('Follow-up message sent: ' + content);
  } catch (error: any) {
    debug('Error sending follow-up message: ' + (error instanceof Error ? error.message : String(error)));
  }
}
