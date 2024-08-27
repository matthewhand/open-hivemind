import OpenAI from 'openai';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import { buildChatCompletionRequestBody } from '@src/llm/openai/buildChatCompletionRequestBody';

/**
 * OpenAiService class interacts with OpenAI's API to perform tasks such as generating completions.
 *
 * This class uses the official OpenAI SDK to manage API calls and is configurable through
 * the ConfigurationManager. It handles the request-building process and manages responses from
 * OpenAI's services.
 */
export class OpenAiService {
  private openai: OpenAI;
  private busy: boolean;
  private static instance: OpenAiService;

  private constructor() {
    this.openai = new OpenAI(ConfigurationManager.getConfig('openai_api_key'));
    this.busy = false;
  }

  public static getInstance(): OpenAiService {
    if (!OpenAiService.instance) {
      OpenAiService.instance = new OpenAiService();
    }
    return OpenAiService.instance;
  }

  /**
   * Gets the OpenAI client instance.
   */
  public getClient(): OpenAI {
    return this.openai;
  }

  /**
   * Sets the busy state of the service.
   */
  public setBusy(state: boolean): void {
    this.busy = state;
  }

  /**
   * Checks if the service is busy.
   */
  public isBusy(): boolean {
    return this.busy;
  }

  /**
   * Checks if the role provided is valid for OpenAI chat completion.
   *
   * @param role - The role to validate (e.g., 'user', 'system', 'assistant').
   * @returns True if the role is valid, otherwise false.
   */
  public isValidRole(role: string): boolean {
    const validRoles = ['user', 'system', 'assistant'];
    return validRoles.includes(role);
  }

  /**
   * Returns the current model used by the service.
   */
  public getModel(): string {
    return ConfigurationManager.LLM_MODEL;
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
