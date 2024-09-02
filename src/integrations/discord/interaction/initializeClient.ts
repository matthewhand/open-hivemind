import { Client, GatewayIntentBits } from 'discord.js';
import Debug from 'debug';

const log = Debug('app:initializeClient');

/**
 * Initializes the Discord client with the necessary intents.
 * 
 * @returns {Client} The initialized Discord client instance.
 */
export const initializeClient = (): Client => {
    log('Initializing Discord client with intents: Guilds, GuildMessages, GuildVoiceStates');
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
        ],
    });
};
