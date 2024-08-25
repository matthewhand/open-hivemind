import { Client, Message } from 'discord.js';
import Debug from 'debug';
import { loginToDiscord } from '../auth/loginToDiscord';
import { setMessageHandler } from './setMessageHandler';

const debug = Debug('app:discord:initializeClient');

/**
 * Initializes the Discord client by logging in and setting up event handlers.
 * Exits the process if initialization fails.
 * @param client - The Discord client instance.
 */
export async function initializeClient(client: Client): Promise<void> {
    debug('Initializing DiscordManager.');

    try {
        const token = process.env.DISCORD_TOKEN || '';
        if (!token) {
            debug('DISCORD_TOKEN is not set, exiting process with code 1');
            process.exit(1);
        }

        debug('Logging in with token...');
        await loginToDiscord(client, token);

        debug('Setting up event handlers');
        setMessageHandler(
            client,
            async (message: Message): Promise<void> => {
                debug('Received message: ' + message.content);
            },
            new Map<string, number>(),
            async (channelId: string) => []
        );
    } catch (error: any) {
        const errorMessage = 'Error during Discord initialization: ' + (error instanceof Error ? error.message : String(error));
        debug(errorMessage);
        process.exit(1); // Exits the process if the initialization fails
    }
}
