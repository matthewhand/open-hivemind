import Debug from "debug";
const debug = Debug("app");

import Debug from 'debug';
import { getRandomErrorMessage } from './getRandomErrorMessage';
const debug = Debug('app:utils:handleError');

/**
 * Handles errors by logging them and optionally sending a random error message to a message channel.
 * 
 * @param {Error} error - The error object to be handled.
 * @param {any} [messageChannel=null] - The message channel to send the error message to.
 */
export function handleError(error: Error, messageChannel: any = null): void {
    debug(`Error Message: ${error.message}`);
    debug(`Error Stack Trace: ${error.stack}`);
    if (messageChannel && typeof messageChannel.send === 'function') {
        const errorMsg = getRandomErrorMessage();
        messageChannel.send(errorMsg);
    }
}
