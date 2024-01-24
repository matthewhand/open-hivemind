// Assuming you are using Discord.js v13 or newer
const { Permissions } = require('discord.js');

/**
 * Checks if a user is eligible to initiate a mute.
 * Implement this based on your server's rules or user privileges.
 * 
 * @param {string} userId - The ID of the user to check.
 * @returns {boolean} - Whether the user is eligible to mute someone.
 */
function checkMutingEligibility(userId) {
    // Placeholder logic - implement your own eligibility criteria
    return true;
}

/**
 * Mutes a member in the server using Discord's timeout feature.
 * 
 * @param {GuildMember} member - The member to mute.
 * @param {number} durationMs - The duration in milliseconds for the mute.
 * @param {string} reason - The reason for muting the member.
 * @returns {Promise<void>} - A Promise that resolves when the mute is applied.
 */
async function muteMember(member, durationMs, reason = 'No reason provided') {
    if (!member.guild.me.permissions.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
        throw new Error("Bot does not have permission to mute members (MODERATE_MEMBERS).");
    }

    await member.timeout(durationMs, reason);
}

/**
 * Parses a duration string into milliseconds.
 * 
 * @param {string} duration - The duration string, e.g., '1h', '30m'.
 * @returns {number} - The duration in milliseconds.
 */
function parseDuration(duration) {
    const match = duration.match(/(\d+)(h|m|s)/);
    const durationValue = parseInt(match[1]);
    const durationType = match[2];

    switch (durationType) {
        case 'h': return durationValue * 60 * 60 * 1000;
        case 'm': return durationValue * 60 * 1000;
        case 's': return durationValue * 1000;
        default: return 0;
    }
}

module.exports = { checkMutingEligibility, muteMember, parseDuration };
