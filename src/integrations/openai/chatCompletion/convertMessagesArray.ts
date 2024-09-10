import { IMessage } from '@src/message/interfaces/IMessage';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';
import { OpenAI } from 'openai';

/**
 * Converts an array of IMessage into an array of ChatCompletionMessageParam
 *
 * @param historyMessages - The array of past messages
 * @returns {OpenAI.Chat.ChatCompletionMessageParam[]}
 */
export function convertMessagesArray(
  historyMessages: IMessage[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return historyMessages.map(convertIMessageToChatParam);
}
