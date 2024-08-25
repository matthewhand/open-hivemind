import { TextChannel, EmbedBuilder } from "discord.js";
import logger from '@src/utils/logger';

/**
 * Mutes a user in the specified channel.
 * @param {TextChannel} channel - The channel where the user will be muted.
 * @param {string} userId - The ID of the user to be muted.
 * @returns {Promise<void>} Resolves when the user is muted.
 */
export async function muteUser(channel: TextChannel, userId: string): Promise<void> {
    logger.debug('Muting user with ID: ' + userId + ' in channel: ' + channel.id);

    const member = await channel.guild.members.fetch(userId);
    const role = channel.guild.roles?.cache.find(role => role.name === 'Muted');

    if (!role) {
        logger.error('Mute role not found');
        return;
    }

    await member.roles.add(role);
    logger.debug('User muted successfully');

    const embed = new EmbedBuilder()
        .setTitle('User Muted')
        .setDescription('The user has been muted.')
        .addFields({ name: 'User ID', value: userId })
        .setColor('#FF0000');

    await channel.send({ embeds: [embed] });
    logger.debug('Mute confirmation message sent');
}
