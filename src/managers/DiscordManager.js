// src/managers/DiscordManager.js
const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');
const discordUtils = require('../utils/discordUtils');

class DiscordManager {
    static instance;
    client;
    messageHandler;

    constructor() {
        if (DiscordManager.instance) {
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

    setMessageHandler(messageHandlerCallback) {
        this.messageHandler = messageHandlerCallback; // Dynamically assign the message handler
        this.setupEventHandlers(); // Ensure event handlers are set up after assigning the message handler
    }

    initialize() {
        this.client.once('ready', () => {
            logger.info(`Bot logged in as ${this.client.user.tag} with ID: ${this.client.user.id}`);
            // Delay the setup of event handlers until the message handler is set
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration. Exiting...');
            process.exit(1);
        } else {
            this.client.login(token).catch(error => logger.error('Error logging into Discord:', error));
        }
    }

    setupEventHandlers() {
        this.client.on('messageCreate', async (message) => {
            if (this.messageHandler) {
                try {
                    const processedMessage = await discordUtils.processDiscordMessage(message);
                    await this.messageHandler(processedMessage);
                } catch (error) {
                    logger.error('Error processing message:', error);
                }
            } else {
                logger.warn('Message handler not set in DiscordManager.');
            }
        });
    }

    // Delegate fetchMessages and sendResponse to discordUtils
    async fetchMessages(channelId, limit = 20) {
        return discordUtils.fetchMessages(this.client, channelId, limit);
    }

    async sendResponse(channelId, messageText) {
        return discordUtils.sendResponse(this.client, channelId, messageText);
    }

    async getBotId() {
        return discordUtils.getBotId(this.client);
    }

    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }
}

module.exports = DiscordManager;
