import { sendResponse } from '@src/message/helpers/sendResponse';
import { processAIResponse } from '@src/message/handlers/processAIResponse';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Processes a command within a message and triggers the appropriate responses.
 *
 * @param message - The message containing the command.
 */
export async function processCommand(message: IMessage): Promise<void> {
    try {
        const content = message.content.toLowerCase();
        if (content.startsWith('!ai')) {
            const aiResponse = await processAIResponse(message, [], Date.now());
            if (aiResponse) {
                await sendResponse(message.client, message.channelId, aiResponse);
            } else {
                throw new Error('AI Response is undefined');
            }
        }
    } catch (error: any) {
        console.error('[processCommand] Error processing command:', error);
    }
}
