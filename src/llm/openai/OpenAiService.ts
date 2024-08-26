import Debug from "debug";
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


import { OpenAIApi, Configuration } from 'openai';
import { LlmService } from '@src/llm/interfaces/LlmService';
import { buildRequestBody } from '@src/llm/openai/operations/buildRequestBody';
import { sendRequest } from '@src/llm/openai/operations/sendRequest';

export class OpenAiService implements LlmService {
  private api: OpenAIApi;
  private isProcessing: boolean = false;

  constructor(apiKey: string) {
    const configuration = new Configuration({ apiKey });
    this.api = new OpenAIApi(configuration);
  }

  /**
   * Builds the request body for the OpenAI API.
   * @param prompt The input prompt for generating a response.
   * @returns The built request body.
   */
  buildRequestBody(prompt: string): object {
    if (!prompt) {
      debug('No prompt provided for buildRequestBody');
      return {};
    }

    debug('Building request body for prompt:', prompt);
    return buildRequestBody(prompt);
  }

  /**
   * Sends the request to the OpenAI API and processes the response.
   * @param requestBody The prepared request body.
   * @returns The API response.
   */
  async sendRequest(requestBody: object): Promise<any> {
    if (!requestBody) {
      debug('No requestBody provided for sendRequest');
      return {};
    }

    debug('Sending request to OpenAI API with body:', requestBody);
    return sendRequest(this.api, requestBody);
  }

  /**
   * Checks if the service is currently processing a request.
   * @returns True if the service is processing, false otherwise.
   */
  isBusy(): boolean {
    return this.isProcessing;
  }
}
