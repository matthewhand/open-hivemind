import { Client, Message } from 'discord.js';
import logger from '@src/utils/logger';
import { loginToDiscord } from '../login/loginToDiscord';
import { setMessageHandler } from './setMessageHandler';

/**
 * Initializes the Discord client by logging in and setting up event handlers.
 * Exits the process if initialization fails.
 * @param client - The Discord client instance.
 */
export async function initializeClient(client: Client): Promise<void> {
    logger.info('Initializing DiscordManager.');

    try {
        const token = process.env.DISCORD_TOKEN || '';
        if (!token) {
            logger.error('DISCORD_TOKEN is not set, exiting process with code 1');
            process.exit(1);
        }

        logger.info('Logging in with token...');
        await loginToDiscord(client, token);

        logger.info('Setting up event handlers');
        setMessageHandler(
            client,
            async (message: Message): Promise<void> => {
                logger.info(`Received message: ${message.content}`);
            },
            new Map<string, number>(),
            async (channelId: string) => []
        );
    } catch (error: any) {
        const errorMessage = `Error during Discord initialization: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMessage);
        process.exit(1); // Exits the process if the initialization fails
    }
}
