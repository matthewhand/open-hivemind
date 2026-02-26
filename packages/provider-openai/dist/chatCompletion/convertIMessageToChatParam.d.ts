import type { IMessage } from '@src/message/interfaces/IMessage';
import type { OpenAI } from 'openai';
/**
 * Converts an `IMessage` object to OpenAI's `ChatCompletionMessageParam` format.
 *
 * Key Features:
 * - **Type Mapping**: Converts `IMessage` to `ChatCompletionMessageParam`.
 *   - Expected OpenAI type `ChatCompletionMessageParam`:
 *     - `role: 'system' | 'user' | 'assistant' | 'function'`
 *     - `content: string | ChatCompletionContentPart[]`
 *     - `name?: string`
 *
 * @param msg - The `IMessage` object to be converted.
 * @returns The converted `ChatCompletionMessageParam` object.
 */
export declare function convertIMessageToChatParam(msg: IMessage): OpenAI.Chat.ChatCompletionMessageParam;
//# sourceMappingURL=convertIMessageToChatParam.d.ts.map