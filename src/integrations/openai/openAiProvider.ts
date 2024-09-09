/**
 * OpenAI provider implements the ILlmProvider interface.
 * It determines the API endpoint based on the message history and user input.
 * Generates a response based on the message history and the latest user input.
 */

import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import Debug from 'debug';

const debug = Debug('app:openAiProvider');

/**
 * OpenAI provider implementation.
 * Supports both chat and non-chat completions.
 */
export const openAiProvider: ILlmProvider = {
  /**
   * Indicates that OpenAI supports chat completions.
   * @returns {boolean} True since OpenAI supports both chat and non-chat completions.
   */
  supportsChatCompletion: () => true,

  /**
   * Indicates that OpenAI supports non-chat completions.
   * @returns {boolean} True since OpenAI supports both chat and non-chat completions.
   */
  supportsCompletion: () => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a chat-based completion using the OpenAI API.
   * @param {IMessage[]} historyMessages - The message history to send to OpenAI.
   * @param {string} userMessage - The latest user message.
   * @returns {Promise<string>} The generated response from OpenAI.
   */
  generateChatCompletion: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
    debug('Generating response from OpenAI with userMessage:', userMessage);
    
    // Map the message history to OpenAI format
    const messages = historyMessages.map(msg => ({
      role: msg.isFromBot() ? 'assistant' : 'user',
      content: msg.getText(),
    }));
    messages.push({ role: 'user', content: userMessage });

    // Ensure the API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is missing.');
    }

    // Select API endpoint based on the format of the message history
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const url = messages.length > 1 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.openai.com/v1/completions';

    debug(`Using OpenAI model: ${model}`);
    debug(`OpenAI API endpoint: ${url}`);

    try {
      // Call OpenAI API based on the selected endpoint
      const response = await axios.post(
        url,
        {
          model,
          messages: url.includes('chat') ? messages : undefined,
          prompt: !url.includes('chat') ? messages.map(msg => msg.content).join('\n') : undefined,
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      const generatedText = url.includes('chat')
        ? response.data.choices[0].message.content
        : response.data.choices[0].text;

      debug('Generated response from OpenAI:', generatedText);
      return generatedText;
    } catch (error) {
      debug(`Error generating response from OpenAI: ${(error as Error).message}`);
      throw new Error(`Error generating response from OpenAI: ${(error as Error).message}`);
    }
  },

  /**
   * Generates a non-chat completion.
   * @param {string} prompt - The prompt to send to OpenAI.
   * @returns {Promise<string>} The generated response from OpenAI.
   */
  generateCompletion: async (prompt: string): Promise<string> => {
    throw new Error("Completion (non-chat) not implemented.");
  },
};
