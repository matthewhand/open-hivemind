import { SlashCommandBuilder } from 'discord.js';
import { handleUserCommand } from '@command/common/user';

export const data = new SlashCommandBuilder()
    .setName('user')
    .setDescription('Displays information about the user who invoked the command');

export async function execute(interaction: any): Promise<void> {
    const response = await handleUserCommand(interaction);
    await interaction.reply(response);
}
