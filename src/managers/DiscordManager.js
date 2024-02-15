const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const DiscordMessage = require('../models/DiscordMessage'); // Assuming DiscordMessage implements IMessage

class DiscordManager {
    static instance;
    client;
    botId;

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
    }

    initialize() {
        this.client.once('ready', () => {
            if (this.client.user) {
                this.botId = this.client.user.id;
                logger.info(`Bot logged in as ${this.client.user.tag} with ID: ${this.botId}`);
            } else {
                logger.error('Client is ready but client.user is undefined.');
            }
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration.');
            process.exit(1);
        }
        this.client.login(token).catch(error => logger.error('Error logging into Discord:', error));
    }

    async getBotId(retryCount = 3, retryDelay = 2000) {
        // Implementation remains similar to the provided example
    }

    async fetchMessages(channelId, limit = 20) {
        const messages = [];
        try {
            const channel = await this.client.channels.fetch(channelId);
            const fetchedMessages = await channel.messages.fetch({ limit });
            fetchedMessages.forEach(message => messages.push(new DiscordMessage(message)));
            logger.debug(`Fetched ${messages.length} messages from channel ID: ${channelId}`);
        } catch (error) {
            logger.error(`Error fetching messages from Discord: ${error}`);
        }
        return messages;
    }

    async sendResponse(channelId, messageText) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(messageText);
            logger.debug(`Message sent to channel ID: ${channelId}`);
        } catch (error) {
            logger.error(`Error sending response to Discord: ${error}`);
        }
    }

    static getInstance() {
        if (!DiscordManager.instance) {
            new DiscordManager();
        }
        return DiscordManager.instance;
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
    }
    
}

module.exports = DiscordManager;
