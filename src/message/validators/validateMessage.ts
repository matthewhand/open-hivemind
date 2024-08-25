import Debug from "debug";
const debug = Debug("app");

import { IMessage } from '@src/message/interfaces/IMessage';
export function validateMessage(message: IMessage): boolean {
    try {
        const isValid = message.getText().length > 0 && message.getAuthorId() !== '';
        debug('Message validation ' + (isValid ? 'passed' : 'failed'));
        return isValid;
    } catch (error: any) {
        debug('Failed to validate message: ' + error.message);
        return false;
    }
}
