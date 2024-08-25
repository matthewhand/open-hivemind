import { Message } from 'discord.js';
import { OpenAiManager } from '@src/openai/OpenAiManager';
import Debug from 'debug';

const debug = Debug('app:message:sendAiGeneratedMessage');

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
