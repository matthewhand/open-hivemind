const logger = require('./logger'); // Ensure logger is imported

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
    constructor(discordSettings, interrobangBonus, timeVsResponseChanceEnv, mentionBonus = 0.2) {
        this.discordSettings = discordSettings;
        this.interrobangBonus = interrobangBonus;
        this.mentionBonus = mentionBonus;

        let timeVsResponseChance;
        try {
            timeVsResponseChance = JSON.parse(timeVsResponseChanceEnv);
        } catch (e) {
            console.error("Error parsing TIME_VS_RESPONSE_CHANCE, using default values:", e);
            timeVsResponseChance = [[12345, 0.05], [7 * 60000, 0.75], [69 * 60000, 0.1]]; // Default values
        }

        this.lastReplyTimes = new LastReplyTimes(
            Math.max(...timeVsResponseChance.map(([duration]) => duration)),
            discordSettings.unsolicitedChannelCap
        );
        this.llmWakewords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [];
        this.recentMessagesCount = {};
        this.botResponsePenalty = parseFloat(process.env.BOT_RESPONSE_CHANGE_PENALTY || '0.4'); // multiply percentage by 0.4

        this.mentionBonus = mentionBonus || 0.2;  // Default to +20% if not provided
    }

    isDirectlyMentioned(ourUserId, message) {
        return message.mentions.has(ourUserId) || 
               this.llmWakewords.some(wakeword => message.content.includes(wakeword.trim()));
    }

    calcBaseChanceOfUnsolicitedReply(message) {
        const currentTimestamp = Date.now();
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, currentTimestamp);
    
        console.debug(`[calcBaseChance] Time since last send: ${timeSinceLastSend}ms`);

        // If time since last send is Infinity, return 100% chance
        if (timeSinceLastSend === Infinity) {
            console.debug('[calcBaseChance] Time since last send is Infinity, setting base chance to 1 (100%)');
            return 1; // 100% chance
        }
    
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
        try {
            this.logMessage(message);

            let baseChance = this.provideUnsolicitedReplyInChannel(ourUserId, message);

            // Apply bot response penalty if the message is from another bot
            if (message.author.bot) {
                baseChance *= this.botResponsePenalty;
                logger.debug(`Bot response penalty applied. New chance: ${baseChance}`);
            }

            // Apply mention bonus if the bot is directly mentioned
            if (this.isDirectlyMentioned(ourUserId, message)) {
                baseChance += this.mentionBonus;
                logger.debug(`Bot mention bonus applied. New chance: ${baseChance}`);
            }

            return Math.random() < baseChance;
        } catch (error) {
            logger.error(`Error in shouldReplyToMessage: ${error.message}`);
            return false;
        }
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
