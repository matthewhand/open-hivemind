import Debug from "debug";
import { getRandomErrorMessage } from './getRandomErrorMessage';

const debug = Debug('app:handleError');

/**
 * Handles errors by logging them and optionally sending a random error message to a message channel.
 * 
 * @param error - The error object to be handled.
 * @param messageChannel - The message channel to send the error message to.
 */
export function handleError(error: Error, messageChannel: any = null): void {
  debug(`Error Message: ${error.message}`);
  debug(`Error Stack Trace: ${error.stack}`);

  if (messageChannel && typeof messageChannel.send === 'function') {
    const errorMsg = getRandomErrorMessage();
    messageChannel.send(errorMsg);
  }
}
