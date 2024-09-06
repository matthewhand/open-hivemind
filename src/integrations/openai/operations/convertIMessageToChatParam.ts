import { IMessage } from '@src/message/interfaces/IMessage';
import { ChatCompletionMessageParam } from 'openai';

/**
 * Converts an IMessage object into OpenAI's ChatCompletionMessageParam format.
 * @param message - The IMessage object to convert.
 * @returns {ChatCompletionMessageParam} - The formatted message for OpenAI API.
 */
export function convertIMessageToChatParam(message: IMessage): ChatCompletionMessageParam {
    return {
        role: message.role,
        content: message.content,
        // Optional: Include name if applicable (for system messages)
        name: message.role === 'system' ? 'system_name' : undefined,
    };
}
