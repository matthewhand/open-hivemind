import Debug from "debug";
import { Message } from 'discord.js';

const debug = Debug('app:processAIResponse');

/**
 * Processes an AI response to a given result and replies to the original message.
 *
 * This function handles the processing of an AI-generated response based on the result of a command
 * or action, and replies to the original message with the AI response.
 *
 * @param {string} result - The result of the command or action.
 * @param {Message<boolean>} message - The original message object.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
export async function processAIResponse(
  result: string,
  message: Message<boolean>
): Promise<void> {
  try {
    debug('Processing AI response for result: ' + result);
    // Simulated AI response logic based on the result
    const aiResponse = `AI Response for: ${result}`;
    await message.reply(aiResponse);
  } catch (error: any) {
    debug('Error processing AI response: ' + (error instanceof Error ? error.message : String(error)));
  }
}
