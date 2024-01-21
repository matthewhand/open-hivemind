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

    timeSinceLastMention(channelId, currentTimestamp) {
        if (!this.times[channelId]) {
            return Infinity;
        }
        return currentTimestamp - this.times[channelId];
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
        this.llmWakewords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [];
        this.recentMessagesCount = {};
    }

    isDirectlyMentioned(ourUserId, message) {
        if (message.mentions.has(ourUserId)) return true;
        for (const wakeword of this.llmWakewords) {
            if (message.content.includes(wakeword.trim())) {
                return true;
            }
        }
        return false;
    }

    calculateDecayedResponseChance(timeSinceLastSend) {
        const maxTimeForDecay = 60 * 60 * 1000; // 1 hour in milliseconds
        const decayRate = 0.000001; 
        return Math.exp(-decayRate * Math.min(timeSinceLastSend, maxTimeForDecay));
    }
    
    calcBaseChanceOfUnsolicitedReply(message) {
        const currentTimestamp = Date.now();
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, currentTimestamp);
        let baseChance = 0;
    
        // Sort the timeVsResponseChance array in descending order of duration
        const sortedTimeVsResponseChance = [...this.timeVsResponseChance].sort((a, b) => b[0] - a[0]);
    
        for (let [duration, chance] of sortedTimeVsResponseChance) {
            console.debug(`Checking interval: less than ${duration}ms, chance: ${chance}`);
            if (timeSinceLastSend >= duration) {
                baseChance = chance;
                console.debug(`Time since last send is greater than or equal to ${duration}ms, setting base chance to ${chance}`);
                break;
            }
        }
    
        return baseChance;
    }
        
    calculateDynamicFactor(message) {
        const recentMessages = this.getRecentMessagesCount(message.channel.id);
        return recentMessages > 10 ? 0.5 : 1;
    }

    getRecentMessagesCount(channelId) {
        return this.recentMessagesCount[channelId] || 0;
    }

    logMessage(message) {
        const channelId = message.channel.id;
        this.recentMessagesCount[channelId] = (this.recentMessagesCount[channelId] || 0) + 1;
        setTimeout(() => {
            this.recentMessagesCount[channelId] = Math.max(0, this.recentMessagesCount[channelId] - 1);
        }, 60000); // Decrease count after 1 minute
    }

    provideUnsolicitedReplyInChannel(ourUserId, message) {
        const baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
        if (baseChance === 0) return false;
        let responseChance = baseChance;
        if (message.content.endsWith('?')) responseChance += this.interrobangBonus;
        if (message.content.endsWith('!')) responseChance += this.interrobangBonus;
        return Math.random() < responseChance;
    }

    shouldReplyToMessage(ourUserId, message) {
        this.logMessage(message);
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
