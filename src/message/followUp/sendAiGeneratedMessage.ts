import { Message } from 'discord.js';
import Debug from 'debug';
import { OpenAiService } from '@src/llm/openai/OpenAiService';

const debug = Debug('app:message:sendAiGeneratedMessage');

/**
 * Handles the sending of AI-generated messages.
 * @param {OpenAiService} aiManager - The OpenAI manager instance.
 * @param {Message} originalMessage - The original message that triggered the AI response.
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @returns {Promise<void>} A promise that resolves when the AI response is sent.
 */
export async function sendAiGeneratedMessage(
  aiManager: OpenAiService,
  originalMessage: Message,
  prompt: string
): Promise<void> {
  try {
    // Generate a response using the OpenAiService
    const response = await aiManager.generateResponse(prompt);

    // Reply to the original message with the AI-generated response
    await originalMessage.reply(response);
    debug('AI-generated message sent: ' + response);
  } catch (error: any) {
    debug('Error sending AI-generated message: ' + (error instanceof Error ? error.message : String(error)));
  }
}
