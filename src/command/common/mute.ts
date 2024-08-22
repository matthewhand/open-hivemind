import { CommandInteraction, GuildMember } from 'discord.js';
import logger from '@utils/logger';

/**
 * Mute a user in the guild.
 * @param interaction - The command interaction
 * @param target - The target member to mute
 */
export async function muteUser(interaction: CommandInteraction, target: GuildMember): Promise<void> {
    try {
        await target.voice.setMute(true, 'Muted by bot command');
        logger.info('User ' + target.user.tag + ' has been muted.');
        await interaction.reply(`User ${target.user.tag} has been muted.`);
    } catch (error) {
        logger.error('Failed to mute user: ' + target.user.tag, error);
        await interaction.reply(`Failed to mute ${target.user.tag}.`);
    }
}
