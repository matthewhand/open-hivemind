class LastReplyTimes {
    constructor(cacheTimeout, unsolicitedChannelCap) {
        this.cacheTimeout = cacheTimeout;
        this.unsolicitedChannelCap = unsolicitedChannelCap;
        this.times = {};
    }

    purgeOutdated(latestTimestamp) {
        const oldestTimeToKeep = latestTimestamp - this.cacheTimeout;
        Object.keys(this.times).forEach(channel => {
            if (this.times[channel] < oldestTimeToKeep) {
                delete this.times[channel];
            }
        });
    }

    timeSinceLastMention(channelId, currentTimestamp) {
        return this.times[channelId] ? currentTimestamp - this.times[channelId] : Infinity;
    }
}

class DecideToRespond {
    constructor(discordSettings, interrobangBonus, timeVsResponseChance) {
        this.discordSettings = discordSettings;
        this.interrobangBonus = interrobangBonus;
        this.timeVsResponseChance = timeVsResponseChance;
        this.lastReplyTimes = new LastReplyTimes(
            Math.max(...timeVsResponseChance.map(([duration]) => duration)),
            discordSettings.unsolicitedChannelCap
        );
        this.llmWakewords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [];
        this.recentMessagesCount = {};
    }

    isDirectlyMentioned(ourUserId, message) {
        return message.mentions.has(ourUserId) || 
               this.llmWakewords.some(wakeword => message.content.includes(wakeword.trim()));
    }

    calculateDecayedResponseChance(timeSinceLastSend) {
        const maxTimeForDecay = 60 * 60 * 1000; // 1 hour in milliseconds
        const decayRate = 0.000001; 
        return Math.exp(-decayRate * Math.min(timeSinceLastSend, maxTimeForDecay));
    }
    
    calcBaseChanceOfUnsolicitedReply(message) {
        const currentTimestamp = Date.now();
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, currentTimestamp);
    
        console.debug(`[calcBaseChance] Time since last send: ${timeSinceLastSend}ms`);
    
        for (let [duration, chance] of this.timeVsResponseChance) {
            console.debug(`[calcBaseChance] Checking: timeSinceLastSend (${timeSinceLastSend}ms) <= duration (${duration}ms)`);
            if (timeSinceLastSend <= duration) {
                console.debug(`[calcBaseChance] Interval selected: less than ${duration}ms, setting base chance to ${chance}`);
                return chance;
            }
        }
    
        return 0; // Default case if no interval is matched
    }
                    
    calculateDynamicFactor(message) {
        return this.getRecentMessagesCount(message.channel.id) > 10 ? 0.5 : 1;
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
        let responseChance = baseChance + (message.content.endsWith('?') || message.content.endsWith('!') ? this.interrobangBonus : 0);
        return Math.random() < responseChance;
    }

    shouldReplyToMessage(ourUserId, message) {
        this.logMessage(message);
        return this.isDirectlyMentioned(ourUserId, message) ? { shouldReply: true, isDirectMention: true } :
               this.provideUnsolicitedReplyInChannel(ourUserId, message) ? { shouldReply: true, isDirectMention: false } :
               { shouldReply: false, isDirectMention: false };
    }

    logMention(channelId, sendTimestamp) {
        console.debug(`Logging mention for channel ${channelId} at timestamp ${sendTimestamp}`);
        this.times[channelId] = sendTimestamp;
    }
    }

module.exports = { DecideToRespond };
