import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAI } from 'openai';

/**
 * Converts an `IMessage` object to OpenAI's `ChatCompletionMessageParam` format.
 * 
 * Key Features:
 * - **Type Mapping**: Converts `IMessage` to `ChatCompletionMessageParam`.
 *   - Expected OpenAI type `ChatCompletionMessageParam`:
 *     - `role: 'system' | 'user' | 'assistant'`
 *     - `content: string`
 *     - `name?: string`
 * 
 * @param msg - The `IMessage` object to be converted.
 * @returns The converted `ChatCompletionMessageParam` object.
 */
export function convertIMessageToChatParam(
    msg: IMessage
): OpenAI.Chat.ChatCompletionMessageParam {
    return {
        role: msg.role as 'system' | 'user' | 'assistant', // Expecting these specific roles
        content: msg.getText(),
        name: msg.getAuthorName() || 'unknown',
    };
}
