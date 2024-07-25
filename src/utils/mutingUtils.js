const { MessageEmbed } = require('discord.js');
const logger = require('./logger');

/**
 * Mutes a user in the specified channel.
 * @param {Object} channel - The channel where the user will be muted.
 * @param {string} userId - The ID of the user to be muted.
 * @returns {Promise} Resolves when the user is muted.
 */
async function muteUser(channel, userId) {
    logger.debug('Muting user with ID: ' + userId + ' in channel: ' + channel.id);

    const member = await channel.guild.members.fetch(userId);
    const role = channel.guild.roles.cache.find(role => role.name === 'Muted');

    if (!role) {
        logger.error('Mute role not found');
        return;
    }

    await member.roles.add(role);
    logger.debug('User muted successfully');

    const embed = new MessageEmbed()
        .setTitle('User Muted')
        .setDescription('The user has been muted.')
        .addField('User ID', userId)
        .setColor('#FF0000');

    await channel.send({ embeds: [embed] });
    logger.debug('Mute confirmation message sent');
}

module.exports = {
    muteUser
};
