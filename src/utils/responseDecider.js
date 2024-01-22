class LastReplyTimes {
    constructor(cacheTimeout, unsolicitedChannelCap) {
        this.cacheTimeout = cacheTimeout;
        this.unsolicitedChannelCap = unsolicitedChannelCap;
        this.times = {};
        this.timers = {};
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

    resetTimer(channelId, callback) {
        clearTimeout(this.timers[channelId]);
        this.timers[channelId] = setTimeout(() => {
            callback();
            delete this.timers[channelId]; // Clean up after execution
        }, this.cacheTimeout);
    }

    logMessage(channelId, currentTimestamp) {
        this.times[channelId] = currentTimestamp;
        if (this.timers[channelId]) {
            clearTimeout(this.timers[channelId]);
        }
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

    startInactivityTimer(channelId, revivalCallback) {
        this.lastReplyTimes.resetTimer(channelId, revivalCallback);
    }

    isDirectlyMentioned(ourUserId, message) {
        return message.mentions.has(ourUserId) || 
               this.llmWakewords.some(wakeword => message.content.includes(wakeword.trim()));
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
    
        return 0;
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
        }, 60000);
    }

    provideUnsolicitedReplyInChannel(ourUserId, message) {
        const baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
        if (baseChance === 0) return false;
        let responseChance = baseChance + (message.content.endsWith('?') || message.content.endsWith('!') ? this.interrobangBonus : 0);
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
        console.debug(`Attempting to log mention for channel ${channelId} at timestamp ${sendTimestamp}`);
        // Ensure that this.lastReplyTimes.times is initialized
        if (!this.lastReplyTimes.times) {
            console.error("Error: 'times' object in LastReplyTimes is undefined.");
            this.lastReplyTimes.times = {}; // Initialize if undefined
        }
        // Correctly access and modify the 'times' property of the LastReplyTimes instance
        this.lastReplyTimes.times[channelId] = sendTimestamp;
        console.debug(`Logged mention for channel ${channelId}. Current state:`, this.lastReplyTimes.times);
    }

}

module.exports = { DecideToRespond };
