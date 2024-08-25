import { Client } from 'discord.js';
import Debug from 'debug';
import { setMessageHandler } from './setMessageHandler';
import { fetchMessages } from '../fetchers/fetchMessages';
import { sendFollowUpMessage } from '@src/message/followUp/sendFollowUpMessage';
import { sendAiGeneratedMessage } from '@src/message/followUp/sendAiGeneratedMessage';
const debug = Debug('app:discord:initializeClient');

/**
 * Initializes the Discord client and sets up message handling.
 * @param {Client} client - The Discord client instance.
 * @param {(message: Message<boolean>, history: Message<boolean>[]) => Promise<void>} handler - Function to handle incoming messages.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 */
export function initializeClient(
  client: Client,
  handler: (message: Message<boolean>, history: Message<boolean>[]) => Promise<void>,
  typingTimestamps: Map<string, number> = new Map()
): void {
  try {
    // Validate client
    if (!client) {
      debug('Discord client is not initialized. Initialization aborted.');
      return;
    }

    // Set up message and typing handlers
    setMessageHandler(client, handler, typingTimestamps, fetchMessages);
    client.on('ready', () => {
      debug('Discord client is ready and handlers are set!');
    });
  } catch (error: any) {
    debug('Error initializing Discord client: ' + (error instanceof Error ? error.message : String(error)));
    // Consider rethrowing or handling specific error cases if critical
  }
}
