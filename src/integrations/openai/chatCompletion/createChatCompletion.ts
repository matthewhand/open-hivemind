import { OpenAI } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';
import { prepareChatCompletionRequest, getOpenAIConfig } from './prepareChatCompletionRequest';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

/**
 * Creates a chat completion using OpenAI's API.
 * It prepares the message and sends it to OpenAI for completion.
 * @param openai - The OpenAI instance.
 * @param historyMessages - The array of past conversation messages.
 * @param userMessage - The user's input message.
 * @param systemMessageContent - A system message to initialize the chat.
 * @param maxTokens - The maximum tokens for the completion.
 * @returns {Promise<string>}
 */
export async function createChatCompletion(
  openai: OpenAI,
  historyMessages: IMessage[],
  userMessage: string,
  systemMessageContent: string,
  maxTokens: number
): Promise<string> {
  const messages = convertIMessageToChatParam(historyMessages);
[].concat(messages.unshift({ role: "system", content: systemMessageContent, name: "system" });

  const { model, temperature } = getOpenAIConfig();

  // Validate input
  if (messages.length === 0) {
    throw new Error('Invalid message format');
  }

  if (!model || !temperature) {
    throw new Error('Missing OpenAI configuration values.');
  }

  if (typeof maxTokens !== 'number' || maxTokens <= 0) {
    throw new Error('Invalid maxTokens value.');
  }

  if (!systemMessageContent) {
    throw new Error('System message content is required.');
  }

  // Debug logging before API call
  console.debug('OpenAI Model:', model);
  console.debug('Temperature Setting:', temperature);
  console.debug('Messages for OpenAI Completion:', JSON.stringify(messages, null, 2));

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: temperature,
  });

  if (!response || !response.choices || response.choices.length === 0) {
    console.warn('OpenAI returned no choices.');
    return '';
  }

  // Debug API response
  console.debug('OpenAI API Response:', JSON.stringify(response, null, 2));

  return response.choices[0].message?.content?.trim() || '';
}
