import { OpenAIApi, Configuration } from 'openai';
import Debug from 'debug';
import { LlmService } from '@src/llm/interfaces/LlmService';
import { buildChatCompletionRequestBody } from './operations/chatCompletions/buildChatCompletionRequestBody';
import { sendRequest } from '@src/llm/openai/operations/sendRequest';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

const debug = Debug('app:OpenAiService');

/**
 * OpenAiService Class
 *
 * This service integrates with the OpenAI API, allowing the bot to generate responses
 * using OpenAI's models. It handles the communication with the API, including request
 * preparation, sending, and response processing.
 *
 * Key Features:
 * - API Key management and initialization
 * - Request body building and response processing
 * - Error handling and logging
 */
export class OpenAiService implements LlmService {
  private static instance: OpenAiService;
  private api: OpenAIApi;
  private isProcessing: boolean = false;

  private constructor(apiKey: string) {
    const configuration = new Configuration({ apiKey });
    this.api = new OpenAIApi(configuration);
  }

  /**
   * Gets the singleton instance of OpenAiService.
   * @param apiKey The API key for authenticating with OpenAI.
   * @returns The singleton instance of OpenAiService.
   */
  public static getInstance(apiKey: string): OpenAiService {
    if (!OpenAiService.instance) {
      OpenAiService.instance = new OpenAiService(apiKey);
    }
    return OpenAiService.instance;
  }

  /**
   * Builds the request body for the OpenAI API.
   * @param historyMessages The input history messages for generating a response.
   * @returns The built request body.
   */
  buildChatCompletionRequestBody(historyMessages: any[]): Promise<object> {
    if (!Array.isArray(historyMessages)) {
      debug('Invalid input: historyMessages must be an array');
      throw new Error('Invalid input: historyMessages must be an array');
    }

    debug('Building request body for history messages: ' + JSON.stringify(historyMessages));
    return buildChatCompletionRequestBody(historyMessages);
  }

  /**
   * Sends a completion request to the OpenAI API.
   * @param prompt The text prompt for generating a response.
   * @returns The API response.
   */
  async sendCompletion(prompt: string): Promise<string> {
    try {
      const response = await this.api.createCompletion({
        model: 'text-davinci-003',
        prompt,
        temperature: 0.9,
        max_tokens: 150,
        stop: [' Human:', ' AI:'],
      });

      return response.data.choices[0].text.trim();
    } catch (error: any) {
      debug('Error sending completion request: ' + error.message);
      throw new Error('Failed to get completion from OpenAI API');
    }
  }

  /**
   * Sends a chat completion request to the OpenAI API and processes the response.
   * @param requestBody The prepared request body.
   * @returns The API response.
   */
  async sendRequest(requestBody: object): Promise<any> {
    if (!requestBody) {
      debug('No requestBody provided for sendRequest');
      return {};
    }

    debug('Sending request to OpenAI API with body: ' + JSON.stringify(requestBody));
    return sendRequest(this.api, requestBody);
  }

  /**
   * Indicates that history is required for chat completions.
   * @returns True since the OpenAI API requires history in chat completion requests.
   */
  requiresHistory(): boolean {
    return true;
  }

  /**
   * Checks if the service is currently processing a request.
   * @returns True if the service is processing, false otherwise.
   */
  isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Sets the busy state of the service.
   * @param state The busy state to set.
   */
  public setBusy(state: boolean): void {
    this.isProcessing = state;
  }

  /**
   * Returns the OpenAIApi client instance.
   * @returns The OpenAIApi client.
   */
  public getClient(): OpenAIApi {
    return this.api;
  }

  /**
   * Returns the model name used by the service.
   * @returns The model name.
   */
  public getModel(): string {
    return ConfigurationManager.LLM_MODEL;
  }
}
