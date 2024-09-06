import { OpenAI } from 'openai';
import Debug from 'debug';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:sendChatCompletion');

/**
 * Sends a chat completion request using OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the chat completion.
 * @returns {Promise<string>} - The generated chat response.
 */
export async function sendChatCompletion(messages: IMessage[]): Promise<string> {
  const openai = new OpenAI({ apiKey: openaiConfig.get<string>('OPENAI_API_KEY')! });

  // Format messages as a single prompt
  const prompt = messages.map(msg => msg.content).join(' ');
  debug(`Generated prompt: ${prompt}`);

  try {
    const response = await openai.completions.create({
      model: openaiConfig.get<string>('OPENAI_MODEL')!,
      prompt,
      max_tokens: openaiConfig.get<number>('OPENAI_MAX_TOKENS')!,
    });

    if (!response.choices || !response.choices.length) {
      throw new Error('No response from OpenAI');
    }

    const result = response.choices[0].text.trim();
    debug('Generated chat completion:', result);
    return result;
  } catch (error: any) {
    debug('Error generating chat completion:', error.message);
    throw new Error(`Failed to generate chat completion: ${error.message}`);
  }
}
