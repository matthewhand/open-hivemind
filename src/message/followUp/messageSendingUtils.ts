import { Message } from 'discord.js';
import { OpenAiManager } from '@src/openai/OpenAiManager';
import Debug from 'debug';
import logger from '@src/utils/logger';
import constants from '@config/ConfigurationManager';

const debug = Debug('app:message:messageSendingUtils');

/**
 * Splits a long message into multiple parts.
 * @param {string} messageContent - The message content to split.
 * @param {number} maxPartLength - The maximum length of each part.
 * @returns {string[]} An array of message parts.
 */
function splitMessageContent(messageContent: string, maxPartLength: number): string[] {
  const parts: string[] = [];
  let currentPart = '';
  const words = messageContent.split(' ');

  for (let word of words) {
    if (currentPart.length + word.length + 1 > maxPartLength) {
      parts.push(currentPart);
      currentPart = word;
    } else {
      currentPart += (currentPart.length > 0 ? ' ' : '') + word;
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  logger.debug('[splitMessageContent] Split message into ' + parts.length + ' parts.');
  return parts;
}

/**
 * Sends a part of a message to a specified text channel.
 * @param {string} part - The content of the message part to send.
 * @param {string} channelId - The ID of the channel to send the message to.
 * @returns {Promise<void>} A promise that resolves when the message part is sent.
 */
async function sendMessagePart(part: string, channelId: string): Promise<void> {
  try {
    logger.debug('[sendMessagePart] Sending message part to channel ' + channelId + '. Content length: ' + part.length);
    // Simulate sending the message part (replace this with actual send logic)
    logger.debug('[sendMessagePart] Sent message part to channel ' + channelId + '. Content: ' + part);
  } catch (error: any) {
    logger.error('[sendMessagePart] Failed to send message part to channel ' + channelId + '. Error: ' + error.message, { error });
    throw new Error('Failed to send message part: ' + error.message);
  }
}

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
    const parts = splitMessageContent(content, constants.MAX_MESSAGE_LENGTH);

    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        await delay(constants.INTER_PART_DELAY);
      }
      await sendMessagePart(parts[i], channel.id);
    }

    debug('Follow-up message sent: ' + content);
  } catch (error: any) {
    debug('Error sending follow-up message: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Handles the sending of AI-generated messages.
 * @param {OpenAiManager} aiManager - The OpenAI manager instance.
 * @param {Message} originalMessage - The original message that triggered the AI response.
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @returns {Promise<void>} A promise that resolves when the AI response is sent.
 */
export async function sendAiGeneratedMessage(
  aiManager: OpenAiManager,
  originalMessage: Message,
  prompt: string
): Promise<void> {
  try {
    const response = await aiManager.generateResponse(prompt);
    await originalMessage.reply(response);
    debug('AI-generated message sent: ' + response);
  } catch (error: any) {
    debug('Error sending AI-generated message: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Utility function to introduce a delay.
 * @param {number} duration - The duration of the delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
function delay(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
