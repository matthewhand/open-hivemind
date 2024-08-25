import { Client } from 'discord.js';
import Debug from 'debug';
import { setMessageHandler } from './setMessageHandler';
import { fetchMessages } from '../fetchers/fetchMessages';

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
    if (!client) {
      debug('Discord client is not initialized.');
      return;
    }

    // Set up message and typing handlers
    setMessageHandler(client, handler, typingTimestamps, fetchMessages);

    client.on('ready', () => {
      debug('Discord client is ready!');
    });
  } catch (error: any) {
    debug('Error initializing Discord client: ' + (error instanceof Error ? error.message : String(error)));
  }
}
