import { CommandInteraction } from 'discord.js';
import logger from '@src/utils/logger';

/**
 * Handles the server command, which provides information about the current server.
 * @param interaction - The command interaction object.
 */
export async function handleServerCommand(interaction: CommandInteraction): Promise<void> {
    try {
        const guild = interaction.guild;

        if (!guild) {
            throw new Error('Guild not found.');
        }

        await interaction.reply(
            `This server is ${guild.name} and has ${guild.memberCount} members.`
        );
    } catch (error) {
        logger.error(`Error executing server command: ${error.message}`);
        await interaction.reply('Failed to retrieve server information.');
    }
}
