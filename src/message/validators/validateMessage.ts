import { IMessage } from '@src/message/interfaces/IMessage';
import logger from '@src/operations/logger';

export function validateMessage(message: IMessage): boolean {
    try {
        const isValid = message.getText().length > 0 && message.getAuthorId() !== '';
        logger.info('Message validation ' + (isValid ? 'passed' : 'failed'));
        return isValid;
    } catch (error: any) {
        logger.error('Failed to validate message: ' + error.message);
        return false;
    }
}
