const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger'); // Ensure logger is properly configured for debug/info/error levels
const configurationManager = require('../config/configurationManager');

class DiscordManager {
    static instance;
    client;
    botId;

    constructor() {
        if (DiscordManager.instance) {
            logger.debug('An instance of DiscordManager already exists. Returning the existing instance.');
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
            if (this.client.user) {
                this.botId = this.client.user.id;
                logger.info(`Bot logged in as ${this.client.user.tag} with ID: ${this.botId}`);
                this.registerSlashCommands().then(() => {
                    logger.info('Slash commands registration complete.');
                }).catch(err => {
                    logger.error('Failed to register slash commands:', err);
                });
            } else {
                logger.error('The client is ready, but the user property is undefined.');
            }
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
        return this.botId;
    }

    async fetchMessages(channelId, limit = 10) {
        if (!channelId) {
            logger.debug('fetchMessages called without a channelId.');
            return [];
        }

        try {
            const channel = await this.client.channels.fetch(channelId);
            const messages = await channel.messages.fetch({ limit });
            logger.debug(`Fetched ${messages.size} messages from channel ID: ${channelId}`);
            return messages.map(msg => ({
                content: msg.content,
                authorId: msg.author.id,
                timestamp: msg.createdTimestamp,
            }));
        } catch (error) {
            logger.error(`Error fetching messages from channel ID ${channelId}:`, error);
            return [];
        }
    }

    async sendResponse(channelId, message) {
        if (!channelId || !message) {
            logger.debug('sendResponse called without a channelId or message.');
            return;
        }

        try {
            const channel = await this.client.channels.fetch(channelId);
            await channel.send(message);
            logger.debug(`Message sent to channel ID: ${channelId}`);
        } catch (error) {
            logger.error(`Error sending response to channel ID ${channelId}:`, error);
        }
    }

    async registerSlashCommands() {
        // Implement the logic to register slash commands, similar to the provided example
    }

    static getInstance() {
        if (!DiscordManager.instance) {
            new DiscordManager();
        }
        return DiscordManager.instance;
    }
}

module.exports = DiscordManager;
