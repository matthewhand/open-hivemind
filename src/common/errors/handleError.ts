import Debug from 'debug';
import { getRandomErrorMessage } from './getRandomErrorMessage';

const debug = Debug('app:handleError');

/**
 * Interface for message channel objects that can send messages
 */
interface MessageChannel {
  send(message: string): Promise<unknown> | unknown;
}

/**
 * Type guard to check if an object is an Error instance
 */
function isError(obj: unknown): obj is Error {
  return (
    obj instanceof Error ||
    (!!obj &&
      typeof obj === 'object' &&
      'message' in obj &&
      typeof (obj as any).message === 'string')
  );
}

/**
 * Type guard to check if an object has a valid send method
 */
function isValidMessageChannel(obj: unknown): obj is MessageChannel {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'send' in obj &&
    typeof (obj as any).send === 'function'
  );
}

/**
 * Handles errors by logging them and optionally sending a random error message to a message channel.
 *
 * @param error - The error object to be handled.
 * @param messageChannel - The message channel to send the error message to.
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 */

export function handleError(error: unknown, messageChannel: any = null): void {
  // Validate error parameter
  if (!isError(error)) {
    debug('Invalid error parameter provided to handleError:', typeof error);
    // Create a fallback error for logging
    const fallbackError = new Error(`Invalid error type: ${typeof error}`);
    debug(`Error Message: ${fallbackError.message}`);
    debug(`Error Stack Trace: ${fallbackError.stack}`);

    if (isValidMessageChannel(messageChannel)) {
      const errorMsg = getRandomErrorMessage();
      try {
        messageChannel.send(errorMsg);
      } catch (sendError) {
        debug('Failed to send error message to channel:', sendError);
      }
    }
    return;
  }

  // Log the validated error
  debug(`Error Message: ${error.message || 'No message available'}`);
  debug(`Error Stack Trace: ${error.stack || 'No stack trace available'}`);

  // Send message to channel if valid
  if (isValidMessageChannel(messageChannel)) {
    const errorMsg = getRandomErrorMessage();
    try {
      messageChannel.send(errorMsg);
      debug('Error message sent to channel successfully');
    } catch (sendError) {
      debug('Failed to send error message to channel:', sendError);
    }
  } else if (messageChannel !== null) {
    debug('Invalid messageChannel provided - missing or invalid send method');
  }
}
