import type { IMessage } from '@src/message/interfaces/IMessage';
/**
 * Generate a chat response using OpenAI without SDK dependency.
 * @param message - User message.
 * @param historyMessages - Chat history.
 * @param options - Additional options.
 * @returns {Promise<string | null>} - Chat response or null.
 */
export declare function generateChatCompletion(message: string, historyMessages: IMessage[], options: {
    parallelExecution: boolean;
    maxRetries: number;
    finishReasonRetry: string;
    isBusy: () => boolean;
    setBusy: (status: boolean) => void;
}): Promise<string | null>;
//# sourceMappingURL=generateChatCompletion.d.ts.map