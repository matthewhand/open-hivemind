const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const DiscordMessage = require('../models/DiscordMessage');
require('dotenv').config(); // Ensures environment variables are loaded, especially for CLIENT_ID

/**
 * Collects slash command definitions from command files within a specified directory.
 * @param {string} commandsPath - The path to the directory containing command files.
 * @returns {Object[]} An array of command definitions ready to be registered with Discord.
 */
function collectSlashCommands(commandsPath) {
    const commands = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) commands.push(command.data.toJSON());
    }

    return commands;
}

/**
 * Registers slash commands with Discord for a specific guild.
 * @param {string} token - The bot token used for authentication with the Discord API.
 * @param {string} guildId - The ID of the guild where commands will be registered.
 * @param {Object[]} commands - The commands to be registered.
 */
async function registerSlashCommands(token, guildId, commands) {
    const clientId = process.env.CLIENT_ID;
    const rest = new REST({ version: '9' }).setToken(token);

    try {
        logger.info(`Registering ${commands.length} slash commands.`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        logger.info('Successfully registered slash commands.');
    } catch (error) {
        logger.error('Failed to register slash commands:', error);
    }
}

/**
 * Fetches messages from a specified Discord channel.
 * @param {Discord.Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel from which messages are fetched.
 * @param {number} limit - The maximum number of messages to fetch.
 * @returns {Promise<DiscordMessage[]>} An array of messages in a generic format.
 */
async function fetchMessages(client, channelId, limit = 20) {
    if (!client) {
        logger.error(`fetchMessages was called with an undefined or null client.`);
        return [];
    }

    if (!client.channels) {
        logger.error(`fetchMessages was called on a client with an undefined or null channels collection.`);
        return [];
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error(`Channel with ID ${channelId} could not be fetched or does not exist.`);
            return [];
        }

        const fetchedMessages = await channel.messages.fetch({ limit });
        return fetchedMessages.map(message => new DiscordMessage(message));
    } catch (error) {
        logger.error(`Error fetching messages from Discord for channel ID ${channelId}:`, error);
        return [];
    }
}

/**
 * Splits a message into chunks that are within Discord's character limit,
 * appending an ellipsis to indicate continuation where necessary.
 * @param {string} messageText - The content of the message to be split.
 * @param {number} [maxLength=1997] - The maximum length of each message part.
 * @returns {string[]} An array of message parts, each within the character limit.
 */
function splitMessage(messageText, maxLength = 1997) {
    const parts = [];
    while (messageText.length) {
        let part = messageText;
        if (messageText.length > maxLength) {
            part = messageText.slice(0, maxLength).trimEnd();
            const lastSpace = part.lastIndexOf(' ');
            if (lastSpace > -1 && lastSpace < maxLength - 1) {
                part = part.slice(0, lastSpace);
            }
            part += '...';
        }
        parts.push(part);
        messageText = messageText.slice(part.length).trimStart();
        if (parts.length > 1 && messageText) {
            messageText = '...' + messageText;
        }
    }
    return parts;
}

/**
 * Sends a response message to a specified Discord channel,
 * automatically handling messages that exceed Discord's character limit.
 * @param {Discord.Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel where the message will be sent.
 * @param {string} messageText - The content of the message to be sent.
 */
async function sendResponse(client, channelId, messageText) {
    if (!messageText) {
        logger.error('sendResponse was called with an undefined or null messageText.');
        return;
    }

    if (!channelId) {
        logger.error('sendResponse was called with an undefined or null channelId.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error(`Failed to fetch channel with ID: ${channelId}`);
            return;
        }

        const messageParts = splitMessage(messageText);

        for (const part of messageParts) {
            await channel.send(part);
            logger.debug(`Message sent to channel ID: ${channelId}`);
        }
    } catch (error) {
        logger.error(`Error sending message to channel ID ${channelId}:`, error);
    }
}

/**
 * Fetches a Discord channel by its ID.
 * This function abstracts the API call to fetch a channel, providing a simplified
 * interface for other utilities to access channel details. It ensures that errors
 * are handled gracefully and logs meaningful information for debugging.
 * 
 * @param {Discord.Client} client - The Discord client instance.
 * @param {string} channelId - The ID of the channel to be fetched.
 * @returns {Promise<Discord.Channel|null>} The fetched channel object or null if an error occurs.
 */
async function fetchChannel(client, channelId) {
    if (!client) {
        logger.error('fetchChannel was called with an undefined or null client.');
        return null;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error(`Failed to fetch channel with ID: ${channelId}. Channel does not exist or cannot be accessed.`);
            return null;
        }
        logger.debug(`Channel with ID: ${channelId} fetched successfully.`);
        return channel;
    } catch (error) {
        logger.error(`Error fetching channel with ID: ${channelId}:`, error);
        return null;
    }
}

module.exports = {
    collectSlashCommands,
    registerSlashCommands,
    fetchMessages,
    sendResponse,
    fetchChannel,
};
