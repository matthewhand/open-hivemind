import type { IMessage } from '@src/message/interfaces/IMessage';
/**
 * Converts IMessage to OpenAI API format.
 * @param message - The IMessage object to convert.
 * @returns An object compatible with OpenAI chat API.
 */
export declare function convertIMessageToChatParam(message: IMessage): {
    role: string;
    content: string;
    name?: string;
};
//# sourceMappingURL=convertIMessageToChatParam.d.ts.map