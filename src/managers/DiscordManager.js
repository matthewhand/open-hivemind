const { Client, GatewayIntentBits } = require('discord.js');
const logger = require('../utils/logger');
const configurationManager = require('../config/configurationManager');

class DiscordManager {
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

        this.botUserId = null; // Add a property to store the bot's user ID

        this.initialize();
        DiscordManager.instance = this;
    }

    initialize() {
        this.client.once('ready', () => {
            logger.info(`Logged in as ${this.client.user.tag}!`);
            this.botUserId = this.client.user.id; // Store the bot's user ID upon successful login
            this.postInitialization();
        });

        const token = configurationManager.getConfig('DISCORD_TOKEN');
        if (!token) {
            logger.error('DISCORD_TOKEN is not defined in the configuration.');
            process.exit(1);
        }

        this.client.login(token);
    }

    postInitialization() {
        // Setup event handlers and any other necessary post-initialization logic here
    }

    async fetchMessages(channelId, limit = 10) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            const messages = await channel.messages.fetch({ limit });
            // Enhance the map function to include role based on authorId comparison with botUserId
            return messages.map(msg => ({
                content: msg.content,
                role: msg.author.id === this.botUserId ? 'assistant' : 'user', // Determine role based on ID comparison
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

    static getInstance() {
        if (!DiscordManager.instance) {
            DiscordManager.instance = new DiscordManager();
        }
        return DiscordManager.instance;
    }

    // Add a getter for the botUserId for external access if needed
    getBotUserId() {
        return this.botUserId;
    }
}

module.exports = DiscordManager;
