const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');

class DiscordManager {
    static instance;
    botId; // Declare botId to store the client's user ID

    constructor() {
        if (DiscordManager.instance) {
            logger.debug('Returning existing instance of DiscordManager.');
            return DiscordManager.instance;
        }
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.initialize();
        DiscordManager.instance = this;
        logger.debug('DiscordManager instance created.');
    }

    initialize() {
        this.client.once('ready', () => {
            if (this.client.user) {
                logger.info(`Logged in as ${this.client.user.tag}!`);
                this.botId = this.client.user.id; // Safely store the bot's user ID on client ready
                logger.debug(`Bot ID set to ${this.botId}`);
            } else {
                logger.error('Client is ready but client.user is undefined.');
                // Handle the situation appropriately, maybe set a flag or retry login
            }
        });
    
        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration.');
            process.exit(1);
        }
        this.client.login(token).catch(error => logger.error('Error logging into Discord:', error));
    }
    
    // getBotId() {
    //     if (!this.botId) {
    //         logger.error('Trying to access bot ID before it is set. Ensure client is ready.');
    //         return null; // Or handle this case as needed
    //     }
    //     return this.botId;
    // }

    // Method to lazily get the bot ID
    async getBotId() {
        if (!this.botId && this.client.user) {
            this.botId = this.client.user.id;
        } else if (!this.botId) {
            // Optionally wait for the client to be ready if the bot ID is still not set
            await new Promise(resolve => this.client.once('ready', () => resolve()));
            this.botId = this.client.user?.id;
        }
        if (!this.botId) {
            logger.warn('Bot ID is still not available after waiting for client ready event.');
        }
        return this.botId;
    }

    // New method to fetch the last non-bot message
    async fetchLastNonBotMessage(channelId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            const messages = await channel.messages.fetch({ limit: 100 }); // Adjust limit as needed
            const lastNonBotMessage = messages.find(msg => msg.author.id !== this.client.user.id);
            return lastNonBotMessage;
        } catch (error) {
            logger.error(`Error fetching last non-bot message: ${error}`);
            return null;
        }
    }

    

    static getInstance() {
        if (!DiscordManager.instance) {
            logger.debug('Creating a new instance of DiscordManager.');
            DiscordManager.instance = new DiscordManager();
        } else {
            logger.debug('DiscordManager instance already exists.');
        }
        return DiscordManager.instance;
    }


    async fetchMessages(channelId, limit = 10) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            const messages = await channel.messages.fetch({ limit });
            return messages.map(msg => ({
                content: msg.content,
                authorId: msg.author.id,
                timestamp: msg.createdTimestamp,
            }));
        } catch (error) {
            logger.error(`Error fetching messages from Discord: ${error}`);
            return [];
        }
    }

    async sendResponse(channelId, message) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(message);
        } catch (error) {
            logger.error(`Error sending response to Discord: ${error}`);
        }
    }

}

module.exports = DiscordManager;
