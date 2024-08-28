import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:summarizeMessage');

/**
 * Placeholder for message summarization using LLM services.
 * 
 * @param message - The message to summarize.
 * @returns A promise that resolves with a placeholder text.
 */
export async function summarizeMessage(message: IMessage): Promise<string> {
    debug('Summarizing message ID: ' + message.getMessageId());
    return 'TODO: Summarization not yet implemented.';
}
