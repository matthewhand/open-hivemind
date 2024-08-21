import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export const userCommand = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides information about the user.'),
    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.reply('This command was run by ' + interaction.user.username + ', who joined on ' + ('joinedAt' in interaction.member ? (interaction.member as GuildMember).joinedAt : 'unknown') + '.');
    },
};
