import { OpenAIApi } from 'openai';
import Debug from 'debug';

const debug = Debug('app:llm:operations:sendCompletionsRequest');

/**
 * Sends a completion request to the OpenAI API and returns the response.
 * @param {OpenAIApi} openai - The initialized OpenAI API client.
 * @param {string} prompt - The prompt to send for completion.
 * @param {number} maxTokens - The maximum number of tokens to generate.
 * @returns {Promise<string>} The generated completion.
 */
export async function sendCompletionsRequest(
  openai: OpenAIApi,
  prompt: string,
  maxTokens: number
): Promise<string> {
  try {
    debug('Sending completion request with prompt: ' + prompt);
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: maxTokens,
    });
    debug('Completion received.');
    return response.data.choices[0].text || '';
  } catch (error) {
    debug('Error in sendCompletionsRequest: ' + (error instanceof Error ? error.message : String(error)), error);
    throw error;
  }
}
