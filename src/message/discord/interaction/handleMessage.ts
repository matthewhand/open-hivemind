import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { shouldReplyToMessage } from '@src/message/responseManager/shouldReplyToMessage';
import { handleAIResponse } from './handleAIResponse';

const debug = Debug('app:discord:handleMessage');

/**
 * Handles an incoming message, determining if an AI response is needed,
 * preparing the request, and sending the response.
 * @param message - The incoming message.
 */
export async function handleMessage(message: IMessage): Promise<void> {
    debug('Received message: ' + message.getText());
    
    if (!shouldReplyToMessage(message)) {
        debug('No AI response needed.');
        return;
    }

    await handleAIResponse(message);
}
