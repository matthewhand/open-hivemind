import Debug from "debug";
import { Client, GatewayIntentBits, Message } from 'discord.js';

const debug = Debug('app:initializeClient');

/**
 * Initializes and returns a new Discord client instance.
 * 
 * This function sets up the Discord client with the necessary intents and event listeners.
 * It ensures the client is ready to interact with the Discord API, handle messages, and maintain voice state.
 * 
 * Key Features:
 * - Configures client intents to manage guilds, messages, and voice states.
 * - Logs client readiness and message events for monitoring and debugging.
 * 
 * @returns {Client} The initialized Discord client.
 */
export function initializeClient(): Client {
    debug('Initializing Discord client with required intents.');
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates
        ],
    });

    client.once('ready', () => {
        debug('Discord client is ready and connected to the gateway!');
    });

    client.on('messageCreate', (message: Message) => {
        if (!message.guild) {
            debug('Ignoring direct message from user:', message.author.tag);
            return;  // Ignore direct messages
        }
        debug('Received a message in guild:', message.guild.name, 'with content:', message.content);
        // Additional message handling logic here
    });

    return client;
}
