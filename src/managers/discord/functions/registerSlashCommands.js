const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const logger = require('../../utils/logger');

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
        logger.info('Registering ' + commands.length + ' slash commands.');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        logger.info('Successfully registered slash commands.');
    } catch (error) {
        logger.error('Failed to register slash commands:', error);
    }
}

module.exports = registerSlashCommands;
