import Debug from "debug";
import { TextChannel, EmbedBuilder } from "discord.js";

const debug = Debug('app:mutingUtils');

/**
 * Mutes a user in the specified channel by adding the 'Muted' role.
 *
 * This function fetches the member using their user ID, then finds and applies the 'Muted' role.
 * If the role does not exist, it logs an appropriate message and exits.
 *
 * @param {TextChannel} channel - The channel where the user will be muted.
 * @param {string} userId - The ID of the user to be muted.
 * @returns {Promise<void>} Resolves when the user is muted.
 */
export async function muteUser(channel: TextChannel, userId: string): Promise<void> {
    debug('Muting user with ID: ' + userId + ' in channel: ' + channel.id);
    const member = await channel.guild.members.fetch(userId);
    const role = channel.guild.roles?.cache.find(role => role.name === 'Muted');
    if (!role) {
        debug('Mute role not found');
        return;
    }
    await member.roles.add(role);
    debug('User muted successfully');
    const embed = new EmbedBuilder()
        .setTitle('User Muted')
        .setDescription('The user has been muted.')
        .addFields({ name: 'User ID', value: userId })
        .setColor('#FF0000');
    await channel.send({ embeds: [embed] });
    debug('Mute confirmation message sent');
}
