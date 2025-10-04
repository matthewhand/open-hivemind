import { OpenAI } from 'openai';
import Debug from 'debug';
import openaiConfig from '@config/openaiConfig';
import { IMessage } from '@src/message/interfaces/IMessage';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:sendChatCompletion');

/**
 * Sends a chat completion request using OpenAI API.
 * @param {IMessage[]} messages - Array of messages for the chat completion.
 * @returns {Promise<string>} - The generated chat response.
 */
export async function sendChatCompletion(messages: IMessage[]): Promise<string> {
  const openai = new OpenAI({ apiKey: openaiConfig.get<'OPENAI_API_KEY'>('OPENAI_API_KEY')! });

  // Format messages as a single prompt
  const prompt = messages.map(msg => msg.content).join(' ');
  debug(`Generated prompt: ${prompt}`);

  try {
    const response = await openai.completions.create({
      model: openaiConfig.get<'OPENAI_MODEL'>('OPENAI_MODEL')!,
      prompt,
      max_tokens: openaiConfig.get<'OPENAI_MAX_TOKENS'>('OPENAI_MAX_TOKENS')!,
    });

    if (!response.choices || !response.choices.length) {
      throw new Error('No response from OpenAI');
    }

    const result = response.choices[0].text.trim();
    debug('Generated chat completion:', result);
    return result;
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);
    
    debug('Error generating chat completion:', ErrorUtils.getMessage(hivemindError));
    
    // Log with appropriate level
    if (classification.logLevel === 'error') {
        console.error('OpenAI chat completion error:', hivemindError);
    }
    
    throw ErrorUtils.createError(
        `Failed to generate chat completion: ${ErrorUtils.getMessage(hivemindError)}`,
        classification.type,
        'OPENAI_CHAT_COMPLETION_ERROR',
        ErrorUtils.getStatusCode(hivemindError),
        { originalError: error }
    );
  }
}
