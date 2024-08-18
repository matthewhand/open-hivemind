import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export const serverCommand = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),
    async execute(interaction: CommandInteraction): Promise<void> {
        await interaction.reply('This server is ' + interaction.guild.name + ' and has ' + interaction.guild.memberCount + ' members.');
    },
};
