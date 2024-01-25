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

    getReplyCount(channelId) {
        return this.times[channelId] || 0;
    }

    incrementReplyCount(channelId) {
        this.times[channelId] = (this.times[channelId] || 0) + 1;
    }
}

class DecideToRespond {
    constructor(discordSettings) {
        console.log("DecideToRespond Constructor: Initializing...");

        this.discordSettings = discordSettings;

        // Default values
        const defaultTimeVsResponseChance = [[12345, 0.05], [420000, 0.75], [4140000, 0.1]];
        const defaultInterrobangBonus = 0.2;  // added
        const defaultMentionBonus = 0.3; // added
        const defaultBotResponsePenalty = 0.1; // multiplied

        // Environment variables or default values
        this.interrobangBonus = parseFloat(process.env.INTERROBANG_BONUS || defaultInterrobangBonus);
        this.mentionBonus = parseFloat(process.env.MENTION_BONUS || defaultMentionBonus);
        this.botResponsePenalty = parseFloat(process.env.BOT_RESPONSE_CHANGE_PENALTY || defaultBotResponsePenalty);

        // Parse the TIME_VS_RESPONSE_CHANCE environment variable or use default values
        let timeVsResponseChance;
        try {
            timeVsResponseChance = JSON.parse(process.env.TIME_VS_RESPONSE_CHANCE || '[[12345, 0.05], [420000, 0.75], [4140000, 0.1]]');
        } catch (e) {
            console.error("Error parsing TIME_VS_RESPONSE_CHANCE, using default values:", e);
            timeVsResponseChance = [[12345, 0.05], [420000, 0.75], [4140000, 0.1]];
        }

        this.timeVsResponseChance = timeVsResponseChance;

        this.lastReplyTimes = new LastReplyTimes(
            Math.max(...timeVsResponseChance.map(([duration]) => duration)),
            discordSettings.unsolicitedChannelCap
        );

        this.llmWakewords = process.env.LLM_WAKEWORDS ? process.env.LLM_WAKEWORDS.split(',') : [];
        this.recentMessagesCount = {};

        console.log("DecideToRespond Constructor: Initialization Complete");
    }    isDirectlyMentioned(ourUserId, message) {
        return message.mentions.has(ourUserId) || 
               this.llmWakewords.some(wakeword => message.content.includes(wakeword.trim()));
    }

    calcBaseChanceOfUnsolicitedReply(message) {
        const currentTimestamp = Date.now();
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, currentTimestamp);

        // For new entries, instead of giving 100%, use a default or minimum chance
        if (timeSinceLastSend === Infinity) {
            const defaultNewChannelChance = 0.001; 
            console.debug(`[calcBaseChance] New channel, setting base chance to ${defaultNewChannelChance}`);
            return defaultNewChannelChance;
        }

        for (let [duration, chance] of this.timeVsResponseChance) {
            console.debug(`[calcBaseChance] Checking: timeSinceLastSend (${timeSinceLastSend}ms) <= duration (${duration}ms)`);
            if (timeSinceLastSend <= duration) {
                console.debug(`[calcBaseChance] Interval selected: less than ${duration}ms, setting base chance to ${chance}`);
                return chance;
            }
        }
    
        return 0; // Return 0 if none of the intervals apply
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
        const channelReplyCount = this.lastReplyTimes.getReplyCount(message.channel.id);

        // Check if the reply count for the channel has reached the cap
        if (channelReplyCount >= this.discordSettings.unsolicitedChannelCap) {
            return false; // Do not reply if cap is reached
        }
        
        const baseChance = this.calcBaseChanceOfUnsolicitedReply(message);
        if (baseChance === 0) return false;
        let responseChance = baseChance + (message.content.endsWith('?') || message.content.endsWith('!') ? this.interrobangBonus : 0);
        decision = Math.random() < responseChance;

        // If deciding to reply, increment the reply count
        if (decision) {
            this.lastReplyTimes.incrementReplyCount(message.channel.id);
        }

        return decision;
    }

    shouldReplyToMessage(ourUserId, message) {
        try {
            this.logMessage(message);
    
            let baseChance = this.provideUnsolicitedReplyInChannel(ourUserId, message);
    
            // Apply mention bonus
            if (this.isDirectlyMentioned(ourUserId, message)) {
                baseChance += this.mentionBonus;
            }
    
            // Apply bot response penalty
            if (message.author.bot) {
                baseChance *= this.botResponsePenalty;
            }
    
            // Ensure baseChance is between 0 and 1
            baseChance = Math.max(0, Math.min(baseChance, 1));
            console.log(`[DecideToRespond] Final chance after adjustments: ${baseChance}`);
    
            const decision = Math.random() < baseChance;
            console.log(`[DecideToRespond] Final decision to reply: ${decision}`);
            return decision;
        } catch (error) {
            console.error(`[Error] DecideToRespond: ${error}`);
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
