import { sendResponse } from '@src/message/helpers/sendResponse';
import { processAIResponse } from './processAIResponse';
import { IMessage } from '@src/types/IMessage';

export async function processCommand(message: IMessage): Promise<void> {
    try {
        const content = message.content.toLowerCase();
        if (content.startsWith('!ai')) {
            const aiResponse = await processAIResponse(message);
            await sendResponse(message.client, message.channelId, aiResponse);
        }
    } catch (error: any) {
        console.error('Failed to process command:', error);
    }
}
