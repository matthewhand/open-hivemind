// utils/mutingUtils.js
const { Permissions } = require('discord.js');

function checkMutingEligibility(userId) {
    // Your eligibility logic here
    return true;
}

async function muteMember(member, durationMs, reason = 'No reason provided') {
    if (!member.guild.me.permissions.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
        throw new Error("Bot does not have permission to mute members.");
    }
    await member.timeout(durationMs, reason);
}

function parseDuration(duration) {
    const match = duration.match(/(\d+)(h|m|s)/);
    if (!match) return 0;
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
