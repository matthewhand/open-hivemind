import { SlashCommandBuilder } from 'discord.js';
import { muteUser } from '@src/command/common/mute';
import { CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutes a user')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to mute')
            .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const target = interaction.options.getMember('target') as GuildMember;
    if (target) {
        await muteUser(interaction, target);
    } else {
        await interaction.reply('Could not find the specified user.');
    }
}
