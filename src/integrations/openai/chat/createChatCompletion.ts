import Debug from 'debug';
import { OpenAI } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:createChatCompletion');

/**
 * Creates a chat completion using the OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the chat completion.
 * @returns {Promise<string>} - The generated chat response.
 */
export async function createChatCompletion(messages: IMessage[]): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Fix: Ensure messages follow the correct format
  const formattedMessages = messages.map(msg => ({ role: msg.role, content: msg.content }));
  debug(`Number of messages: ${formattedMessages.length}`);

  try {
    const response = await openai.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
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
    debug('Error generating chat completion:', error.message);
    throw new Error(`Failed to generate completion: ${error.message}`);
  }
}
