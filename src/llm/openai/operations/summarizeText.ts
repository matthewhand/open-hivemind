import { OpenAIApi } from 'openai';
import Debug from 'debug';

const debug = Debug('app:llm:operations:summarizeText');

/**
 * Sends a text to the OpenAI API to generate a summary.
 * @param {OpenAIApi} openai - The initialized OpenAI API client.
 * @param {string} text - The text to be summarized.
 * @returns {Promise<string>} The generated summary.
 */
export async function summarizeText(
  openai: OpenAIApi,
  text: string
): Promise<string> {
  try {
    debug('Sending text for summarization.');
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Summarize the following text: ${text}`,
      max_tokens: 150,
    });
    debug('Summary received.');
    return response.data.choices[0].text || '';
  } catch (error) {
    debug('Error in summarizeText: ' + (error instanceof Error ? error.message : String(error)), error);
    throw error;
  }
}
