// src/utils/discordUtils.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const DiscordMessage = require('../models/DiscordMessage'); // Ensure DiscordMessage implements IMessage interface

// Collect command definitions from slash command files
function collectSlashCommands(commandsPath) {
    const commands = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) commands.push(command.data.toJSON());
    }

    return commands;
}

// Register slash commands with Discord
async function registerSlashCommands(clientId, token, guildId, commands) {
    const rest = new REST({ version: '9' }).setToken(token);

    try {
        logger.info(`Registering ${commands.length} slash commands.`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        logger.info('Successfully registered slash commands.');
    } catch (error) {
        logger.error('Failed to register slash commands:', error);
    }
}

// Get bot ID with retries
async function getBotId(client, retryCount = 3, retryDelay = 2000) {
    for (let attempt = 0; attempt < retryCount; attempt++) {
        if (client.user) {
            return client.user.id;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    logger.warn('Unable to retrieve the Bot ID after multiple attempts.');
    return null;
}

// Fetch messages from a Discord channel
async function fetchMessages(client, channelId, limit = 20) {
    try {
        const channel = await client.channels.fetch(channelId);
        const fetchedMessages = await channel.messages.fetch({ limit });
        const messages = fetchedMessages.map(message => new DiscordMessage(message));
        logger.debug(`Fetched ${messages.length} messages from channel ID: ${channelId}`);
        return messages;
    } catch (error) {
        logger.error(`Error fetching messages from Discord for channel ID ${channelId}:`, error);
        return [];
    }
}

// Send a response message to a Discord channel
async function sendResponse(client, channelId, messageText) {
    try {
        const channel = await client.channels.fetch(channelId);
        await channel.send(messageText);
        logger.debug(`Message sent to channel ID: ${channelId} with content: "${messageText}"`);
    } catch (error) {
        logger.error(`Error sending response to Discord for channel ID ${channelId}:`, error);
    }
}

/**
 * Converts a Discord message to a generic message format.
 * @param {Discord.Message} message - The Discord message to process.
 * @returns {DiscordMessage} - An instance of DiscordMessage or a similar object that implements the IMessage interface.
 */
async function processDiscordMessage(message) {
    // This is where you transform the Discord message into your generic message format.
    // For example, using the DiscordMessage class:
    return new DiscordMessage(message);
}

// Make sure to export your newly created function
module.exports = {
    processDiscordMessage,
    collectSlashCommands,
    registerSlashCommands,
    getBotId,
    fetchMessages,
    sendResponse,
};
