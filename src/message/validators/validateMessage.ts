import { IMessage } from '@src/message/interfaces/IMessage';
import debug from '@src/operations/debug';

export function validateMessage(message: IMessage): boolean {
    try {
        const isValid = message.getText().length > 0 && message.getAuthorId() !== '';
        debug.info('Message validation ' + (isValid ? 'passed' : 'failed'));
        return isValid;
    } catch (error: any) {
        debug.error('Failed to validate message: ' + error.message);
        return false;
    }
}
