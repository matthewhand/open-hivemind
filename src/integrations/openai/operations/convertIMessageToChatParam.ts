import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Converts IMessage to OpenAI API format.
 * @param message - The IMessage object to convert.
 * @returns An object compatible with OpenAI chat API.
 */
export function convertIMessageToChatParam(message: IMessage): { role: string; content: string; name?: string } {
    return {
        role: message.role,
        content: message.content,
        name: message.getAuthorId() || 'unknown', // Ensure name is always a string
    };
}
