import Debug from 'debug';
import { OpenAI } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:sendCompletions');

/**
 * Sends a completion request using OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the completion.
 * @returns {Promise<string>} - The generated response.
 */
export async function sendCompletions(messages: IMessage[]): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Fix: Ensure messages follow the correct format
  const formattedMessages = messages.map(msg => ({ role: msg.role, content: msg.content }));
  debug(`Number of messages: ${formattedMessages.length}`);

  try {
    const response = await openai.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: formattedMessages,
      max_tokens: 150,
    });

    if (!response.choices || !response.choices.length) {
      throw new Error('No response from OpenAI');
    }

    const result = response.choices[0].message.content.trim();
    debug('Generated completion:', result);
    return result;
  } catch (error: any) {
    debug('Error sending completion:', error.message);
    throw new Error(`Failed to send completion: ${error.message}`);
  }
}
