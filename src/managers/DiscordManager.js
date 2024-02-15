const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const DiscordMessage = require('../models/DiscordMessage'); // Ensure DiscordMessage implements IMessage interface

class DiscordManager {
    static instance;
    client;
    botId;

    constructor() {
        if (DiscordManager.instance) {
            logger.debug('An instance of DiscordManager already exists. Using the existing instance.');
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
        logger.debug('A new instance of DiscordManager has been created.');
    }

    initialize() {
        this.client.once('ready', () => {
            this.botId = this.client.user?.id;
            logger.info(`Bot logged in as ${this.client.user.tag} with ID: ${this.botId}`);
            // Additional initialization actions can be added here.
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => {
                logger.error('Error logging into Discord:', error);
            });
        }
    }

    async getBotId(retryCount = 3, retryDelay = 2000) {
        for (let attempt = 0; attempt < retryCount; attempt++) {
            if (this.botId) {
                logger.debug(`Bot ID retrieved successfully: ${this.botId}`);
                return this.botId;
            }

            logger.debug(`Bot ID not available on attempt ${attempt + 1}. Waiting for the client to be ready...`);
            await new Promise(resolve => {
                setTimeout(() => {
                    if (this.client.user) {
                        this.botId = this.client.user.id;
                        logger.debug(`Bot ID set to ${this.botId} after waiting.`);
                    }
                    resolve();
                }, retryDelay);
            });
        }

        if (!this.botId) {
            logger.warn('Unable to retrieve the Bot ID after multiple attempts.');
        }
        return this.botId || null; // Ensure a null is returned if botId is still not available
    }

    async fetchMessages(channelId, limit = 20) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            const fetchedMessages = await channel.messages.fetch({ limit });
            const messages = fetchedMessages.map(message => new DiscordMessage(message));
            logger.debug(`Fetched ${messages.length} messages from channel ID: ${channelId}`);
            return messages;
        } catch (error) {
            logger.error(`Error fetching messages from Discord for channel ID ${channelId}:`, error);
            return [];
        }
    }

    async sendResponse(channelId, messageText) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(messageText);
            logger.debug(`Message sent to channel ID: ${channelId} with content: "${messageText}"`);
        } catch (error) {
            logger.error(`Error sending response to Discord for channel ID ${channelId}:`, error);
        }
    }

    static getInstance() {
        if (!DiscordManager.instance) {
            new DiscordManager();
        }
        return DiscordManager.instance;
    }
}

module.exports = DiscordManager;
