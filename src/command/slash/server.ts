import { SlashCommandBuilder } from 'discord.js';
import { handleServerCommand } from '@src/command/common/server';

export const data = new SlashCommandBuilder()
    .setName('server')
    .setDescription('Provides information about the server');

export async function execute(interaction: CommandInteraction): Promise<void> {
    await handleServerCommand(interaction);
}
