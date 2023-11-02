// responseDecider.js

class LastReplyTimes {
    constructor(cacheTimeout, unsolicitedChannelCap) {
        this.cacheTimeout = cacheTimeout;
        this.unsolicitedChannelCap = unsolicitedChannelCap;
        this.times = {};
    }

    purgeOutdated(latestTimestamp) {
        const oldestTimeToKeep = latestTimestamp - this.cacheTimeout;
        for (let channel in this.times) {
            if (this.times[channel] < oldestTimeToKeep) {
                delete this.times[channel];
            }
        }
    }

    logMention(channelId, sendTimestamp) {
        this.times[channelId] = sendTimestamp;
    }

    timeSinceLastMention(channelId, sendTimestamp) {
        this.purgeOutdated(sendTimestamp);
        return sendTimestamp - (this.times[channelId] || 0);
    }
}

class DecideToRespond {
    constructor(discordSettings, interrobangBonus, timeVsResponseChance) {
        this.discordSettings = discordSettings;
        this.interrobangBonus = interrobangBonus;
        this.timeVsResponseChance = timeVsResponseChance;
        this.lastReplyTimes = new LastReplyTimes(
            Math.max(...timeVsResponseChance.map(item => item[0])),
            discordSettings.unsolicitedChannelCap
        );
    }

    isDirectlyMentioned(ourUserId, message) {
        if (message.mentions.has(ourUserId)) return true;
        // ... Include any wakeword check logic ...
        return false;
    }

    calculateDecayedResponseChance(timeSinceLastSend) {
        // Define the maximum time to consider for decay (e.g., 1 hour)
        const maxTimeForDecay = 60 * 60 * 1000; // in milliseconds
        const decayRate = 0.05; // Define how quickly the chance decays per millisecond

        // Calculate the decay factor based on the time since the last send
        const decayFactor = Math.exp(-decayRate * Math.min(timeSinceLastSend, maxTimeForDecay));
        return decayFactor;
    }

    calcBaseChanceOfUnsolicitedReply(message) {
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, message.createdTimestamp);
        let baseChance = 0;
        for (let [duration, chance] of this.timeVsResponseChance) {
            if (timeSinceLastSend < duration) {
                baseChance = chance;
                break;
            }
        }
        // Apply the decay to the base chance
        const decayedChance = baseChance * this.calculateDecayedResponseChance(timeSinceLastSend);
        return decayedChance;
    }

    provideUnsolicitedReplyInChannel(ourUserId, message) {
        if (this.discordSettings.disableUnsolicitedReplies) return false;
        const baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
        if (baseChance === 0) return false;
        let responseChance = baseChance;
        if (message.content.endsWith('?')) responseChance += this.interrobangBonus;
        if (message.content.endsWith('!')) responseChance += this.interrobangBonus;

        // Debug log for the calculated percentage
        this.debugLog(`Channel: ${message.channel.id}, BaseChance: ${baseChance}, ResponseChance: ${responseChance}`);

        return Math.random() < responseChance;
    }

    // Debug log function
    debugLog(message) {
        console.log(`[DEBUG] ${message}`);  // Replace with your logger
    }

    shouldReplyToMessage(ourUserId, message) {
        if (this.isDirectlyMentioned(ourUserId, message)) {
            return { shouldReply: true, isDirectMention: true };
        }
        if (this.provideUnsolicitedReplyInChannel(ourUserId, message)) {
            return { shouldReply: true, isDirectMention: false };
        }
        return { shouldReply: false, isDirectMention: false };
    }

    logMention(channelId, sendTimestamp) {
        this.lastReplyTimes.logMention(channelId, sendTimestamp);
    }
}

module.exports = { DecideToRespond };
