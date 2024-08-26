import Debug from "debug";
import { Message } from 'discord.js';

const debug = Debug('app:sendFollowUpMessage');

/**
 * Send Follow-Up Message
 *
 * This function sends a follow-up message to a specified channel, typically used to add context or provide additional value after
 * the initial conversation. It ensures that the follow-up is relevant and timely, based on the original interaction.
 *
 * Key Features:
 * - Sends follow-up messages to enhance the conversation.
 * - Handles errors robustly, ensuring that issues are logged and can be traced.
 * - Logs detailed information about the message-sending process.
 *
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
