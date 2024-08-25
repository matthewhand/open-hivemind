import { Configuration, OpenAIApi } from 'openai';
import { LlmService } from '@src/llm/interfaces/LlmService';
import Debug from 'debug';
const debug = Debug('app:llm:OpenAiService');
/**
 * A class to manage interactions with the OpenAI API, implementing LlmService.
 */
export class OpenAiService implements LlmService {
  private openai: OpenAIApi;
  private busy = false;
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required to instantiate OpenAiService.');
    }
    debug('Initializing OpenAiService with provided API key.');
    const configuration = new Configuration({ apiKey });
    this.openai = new OpenAIApi(configuration);
  }
  /**
   * Generates a response from the AI based on a given prompt.
   * @param {string} prompt - The prompt to generate a response for.
   * @returns {Promise<string>} The generated response.
   */
  async generateResponse(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('A valid prompt string is required to generate a response.');
    }
    this.busy = true;
    debug('Generating response for prompt: ' + prompt);
    try {
      const completion = await this.openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150,
      });
      debug('Response received from OpenAI.');
      return completion.data.choices[0].text || '';
    } catch (error) {
      debug('Error generating response: ' + (error instanceof Error ? error.message : String(error))  error);
      throw error;
    } finally {
      this.busy = false;
      debug('OpenAiService is now idle.');
    }
  }
  /**
   * Checks if the AI service is currently busy processing a request.
   * @returns {boolean} True if the service is busy, false otherwise.
   */
  isBusy(): boolean {
    debug('Checking if OpenAiService is busy: ' + this.busy);
    return this.busy;
  }
}
