import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { generateChatResponse } from './operations/generateChatResponse';
import { generateCompletion } from './completion/generateCompletion';

const debug = Debug('app:openAiProvider');

/**
 * OpenAI provider implementation.
 * Supports both chat and non-chat completions.
 */
export const openAiProvider: ILlmProvider = {
  /**
   * Indicates that OpenAI supports chat completions.
   * @returns {boolean} True since OpenAI supports chat completions.
   */
  supportsChatCompletion: (): boolean => true,

  /**
   * Indicates that OpenAI supports non-chat completions.
   * @returns {boolean} True since OpenAI supports non-chat completions.
   */
  supportsCompletion: (): boolean => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a chat-based completion using the OpenAI API.
   * Delegates the logic to `generateChatResponse`.
   * @param {IMessage[]} historyMessages - The message history to send to OpenAI.
   * @param {string} userMessage - The latest user message.
   * @returns {Promise<string>} The generated response from OpenAI.
   */
  generateChatCompletion: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
    debug('Delegating chat completion to generateChatResponse...');
    return generateChatResponse({ historyMessages, userMessage });
  },

  /**
   * Generates a non-chat completion using the OpenAI API.
   * This method relies on the helper function for non-chat completions.
   * @param {string} prompt - The prompt to send to OpenAI.
   * @returns {Promise<string>} The generated response from OpenAI.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    debug('Generating non-chat completion from OpenAI with prompt:', prompt);

    // Delegate to the helper function for regular completions
    return generateCompletion(prompt);
  },
};
