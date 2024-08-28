import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';

const debug = Debug('app:summarizeMessage');

/**
 * Summarizes the given message using OpenAI's completion service.
 * 
 * @param message - The message to summarize.
 * @returns A promise that resolves with the summary text.
 */
export async function summarizeMessage(message: IMessage): Promise<string> {
    const openAiService = OpenAiService.getInstance();
    const text = message.getText();
    debug('Summarizing message ID: ' + message.getMessageId());

    const summary = await openAiService.createChatCompletion(text);
    debug('Generated summary: ' + summary);

    return summary;
}
