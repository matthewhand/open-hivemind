import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import logger from '@utils/logger';

/**
 * Registers slash commands with Discord for a specific guild.
 * @param {string} token - The bot token used for authentication with the Discord API.
 * @param {string} guildId - The ID of the guild where commands will be registered.
 * @param {object[]} commands - The commands to be registered.
 */
export async function registerSlashCommands(token: string, guildId: string, commands: object[]): Promise<void> {
    const clientId = process.env.CLIENT_ID;
    const rest = new REST({ version: '9' }).setToken(token);

    try {
        logger.info('Registering ' + commands.length + ' slash commands.');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        logger.info('Successfully registered slash commands.');
    } catch (error: any) {
        logger.error('Failed to register slash commands: ' + (error instanceof Error ? error.message : String(error)));
    }
}
