import Debug from 'debug';
const debug = Debug('app:llm:OpenAiService');

import { OpenAIApi, Configuration } from 'openai';
import { LlmService } from '@src/llm/interfaces/LlmService';
import { buildRequestBody } from '@src/llm/openai/operations/buildRequestBody';
import { sendRequest } from '@src/llm/openai/operations/sendRequest';

/**
 * OpenAiService implements LlmService to interact with the OpenAI API.
 * This class handles API requests, response processing, and state management.
 */
export class OpenAiService implements LlmService {
  private api: OpenAIApi;
  private isProcessing: boolean;

  /**
   * Constructor initializes the OpenAI API client with the provided API key.
   * @param {string} apiKey - The API key for authenticating with OpenAI.
   */
  constructor(apiKey: string) {
    const configuration = new Configuration({ apiKey });
    this.api = new OpenAIApi(configuration);
    this.isProcessing = false;
  }

  /**
   * Builds the request body for the OpenAI API based on the provided prompt.
   * @param {string} prompt - The prompt text for the OpenAI API.
   * @returns {object} The request body object.
   */
  buildRequestBody(prompt: string): object {
    debug('Building request body for prompt:', prompt);
    return buildRequestBody(prompt);
  }

  /**
   * Sends the request to the OpenAI API and returns the API response.
   * @param {object} requestBody - The request body to be sent.
   * @returns {Promise<any>} The response from the OpenAI API.
   */
  async sendRequest(requestBody: object): Promise<any> {
    debug('Sending request to OpenAI API with body:', requestBody);
    return sendRequest(this.api, requestBody);
  }

  /**
   * Determines if history is required for the API request.
   * @returns {boolean} False, as history is not required for basic OpenAI requests.
   */
  requiresHistory(): boolean {
    return false;
  }

  /**
   * Checks if the service is currently processing a request.
   * @returns {boolean} True if the service is processing, otherwise false.
   */
  isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Generates a response from the OpenAI API based on the provided prompt.
   * @param {string} prompt - The prompt text for the OpenAI API.
   * @returns {Promise<string>} The generated response text.
   * @throws {Error} If an error occurs during API request or response processing.
   */
  async generateResponse(prompt: string): Promise<string> {
    this.isProcessing = true;
    try {
      debug('Generating response for prompt:', prompt);
      const requestBody = this.buildRequestBody(prompt);
      const response = await this.sendRequest(requestBody);
      debug('Response received from OpenAI API:', response);
      const generatedText = response.choices[0].text.trim();
      return generatedText;
    } catch (error: any) {
      debug('Error generating response from OpenAI:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
}
