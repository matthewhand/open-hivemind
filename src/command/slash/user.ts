import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { handleUserCommand } from '@command/common/user';

export const data = new SlashCommandBuilder()
    .setName('user')
    .setDescription('Displays information about a user');

export async function execute(interaction: CommandInteraction) {
    await handleUserCommand(interaction);
}
