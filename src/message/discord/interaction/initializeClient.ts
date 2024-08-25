import { Client } from 'discord.js';
import { setMessageHandler } from './setMessageHandler';
import Debug from 'debug';
import { fetchMessages } from '@src/message/fetchers/fetchMessages';

const debug = Debug('app:discord:initializeClient');

/**
 * Initializes the Discord client and sets up message handling.
 * @param {Client} client - The Discord client instance.
 * @param {(message: IMessage, history: IMessage[]) => Promise<void>} handler - Function to handle incoming messages.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 */
export function initializeClient(
  client: Client,
  handler: (message: IMessage, history: IMessage[]) => Promise<void>,
  typingTimestamps: Map<string, number>
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
