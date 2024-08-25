import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';

const debug = Debug('app:message:processAIResponse');

/**
 * Processes an AI response to a given result.
 * @param {string} result - The result of the command or action.
 * @param {IMessage} message - The original message object.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
export async function processAIResponse(
  result: string,
  message: IMessage
): Promise<void> {
  try {
    debug('[processAIResponse] Processing AI response for result: ' + result);

    // Simulated AI response logic based on the result
    const aiResponse = `AI Response for: ${result}`;

    await message.reply(aiResponse);
  } catch (error: any) {
    debug('[processAIResponse] Error processing AI response: ' + (error instanceof Error ? error.message : String(error)));
  }
}
