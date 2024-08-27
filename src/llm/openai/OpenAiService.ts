import OpenAI from 'openai';
import ConfigurationManager from '@src/config/ConfigurationManager';
import { buildChatCompletionRequestBody } from '@src/utils/buildChatCompletionRequestBody';

/**
 * OpenAiService class interacts with OpenAI's API to perform tasks such as generating completions.
 *
 * This class uses the official OpenAI SDK to manage API calls and is configurable through
 * the ConfigurationManager. It handles the request-building process and manages responses from
 * OpenAI's services.
 */
export class OpenAiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI(ConfigurationManager.getConfig('openai_api_key'));
  }

  /**
   * Creates a chat completion using OpenAI's API.
   *
   * @param messages - Array of message objects to send to OpenAI.
   * @returns A Promise resolving to the response object from OpenAI.
   */
  public async createChatCompletion(messages: Array<{ role: string; content: string }>): Promise<any> {
    const requestBody = buildChatCompletionRequestBody(messages);
    return this.openai.chat.completions.create(requestBody);
  }
}
