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
        const decayRate = 0.005;
        return Math.exp(-decayRate * Math.min(timeSinceLastSend, maxTimeForDecay));
    }

    calcBaseChanceOfUnsolicitedReply(message) {
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, message.createdTimestamp);
        let baseChance = this.timeVsResponseChance
            .filter(([duration, _]) => timeSinceLastSend < duration)
            .reduce((acc, [_, chance]) => acc + chance, 0) / this.timeVsResponseChance.length;
        const dynamicFactor = this.calculateDynamicFactor(message);
        baseChance *= dynamicFactor;
        return baseChance * this.calculateDecayedResponseChance(timeSinceLastSend);
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
            this.recentMessagesCount[channelId]--;
        }, 60000); // Decrease count after 1 minute
    }

    provideUnsolicitedReplyInChannel(ourUserId, message) {
        const baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
        if (baseChance === 0) return false;
        let responseChance = baseChance;
        if (message.content.endsWith('?')) responseChance += this.interrobangBonus;
        if (message.content.endsWith('!')) responseChance += this.interrobangBonus;
        this.debugLog(`Channel: ${message.channel.id}, BaseChance: ${baseChance}, ResponseChance: ${responseChance}`);
        return Math.random() < responseChance;
    }

    debugLog(message) {
        console.log(`[DEBUG] ${message}`);
    }

    shouldReplyToMessage(ourUserId, message) {
        this.logMessage(message);
        console.log('Checking if should reply to message'); 
    
        if (this.isDirectlyMentioned(ourUserId, message)) {
            console.log('Directly mentioned'); 
            return { shouldReply: true, isDirectMention: true };
        }
        if (this.provideUnsolicitedReplyInChannel(ourUserId, message)) {
            console.log('Decided to provide unsolicited reply');
            return { shouldReply: true, isDirectMention: false };
        }
        console.log('No reply needed'); // Add this line
        return { shouldReply: false, isDirectMention: false };
    }
    }

module.exports = { DecideToRespond };
