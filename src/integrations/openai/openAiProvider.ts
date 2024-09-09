// src/integrations/openai/openAiProvider.ts

/**
 * OpenAI provider implements the ILlmProvider interface.
 * It determines if the model should use chat or non-chat completions, based on environment configuration.
 * It generates a response based on the message history and the latest user input.
 */

import { ILlmProvider } from '@src/llm/interfaces/ILlmProvider';
import { IMessage } from '@src/message/interfaces/IMessage';
import axios from 'axios';
import Debug from 'debug';

const debug = Debug('app:openAiProvider');

/**
 * Determines if the OpenAI model is a chat model.
 * This is read from the environment variable `OPENAI_IS_CHAT_MODEL`.
 * @returns {boolean} True if the model is a chat model, false otherwise.
 */
function isChatModel(): boolean {
  const isChat = process.env.OPENAI_IS_CHAT_MODEL === 'true';
  debug(`isChatModel: ${isChat}`);
  return isChat;
}

/**
 * OpenAI provider implementation.
 * Supports both chat and non-chat completions.
 */
export const openAiProvider: ILlmProvider = {
  /**
   * Indicates that OpenAI supports non-chat completions.
   * @returns {boolean} True since OpenAI supports both chat and non-chat completions.
   */
  supportsNonChat: () => {
    debug('OpenAI supports non-chat completions: true');
    return true;
  },

  /**
   * Generates a response using the OpenAI API.
   * The API endpoint is chosen based on whether the model is chat-based or not.
   * @param {IMessage[]} historyMessages - The message history to send to OpenAI.
   * @param {string} userMessage - The latest user message.
   * @returns {Promise<string>} The generated response from OpenAI.
   */
  generateResponse: async (historyMessages: IMessage[], userMessage: string): Promise<string> => {
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

    // Determine the model and API endpoint
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const url = isChatModel() 
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.openai.com/v1/completions';

    debug(`Using OpenAI model: ${model}`);
    debug(`OpenAI API endpoint: ${url}`);

    try {
      // Call OpenAI API based on whether it’s a chat or completion model
      const response = await axios.post(
        url,
        {
          model,
          messages: isChatModel() ? messages : undefined,
          prompt: !isChatModel() ? messages.map(msg => msg.content).join('\n') : undefined,
        },
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      const generatedText = isChatModel()
        ? response.data.choices[0].message.content
        : response.data.choices[0].text;

      debug('Generated response from OpenAI:', generatedText);
      return generatedText;
    } catch (error) {
      debug(`Error generating response from OpenAI: ${error.message}`);
      throw new Error(`Error generating response from OpenAI: ${error.message}`);
    }
  }
};
