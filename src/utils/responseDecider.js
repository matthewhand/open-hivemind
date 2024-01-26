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
    constructor(config, discordSettings) {
        // Initialization with config and discordSettings
        this.interrobangBonus = config.interrobangBonus;
        this.mentionBonus = config.mentionBonus;
        this.botResponsePenalty = config.botResponsePenalty;
        this.timeVsResponseChance = config.timeVsResponseChance;
        this.llmWakewords = config.llmWakewords;
        this.discordSettings = discordSettings;
        this.lastReplyTimes = new LastReplyTimes(
            Math.max(...this.timeVsResponseChance.map(([duration]) => duration)),
            this.discordSettings.unsolicitedChannelCap
        );
        this.recentMessagesCount = {};
        console.log("DecideToRespond initialized");
    }

    calcBaseChanceOfUnsolicitedReply(message) {
        const currentTimestamp = Date.now();
        const timeSinceLastSend = this.lastReplyTimes.timeSinceLastMention(message.channel.id, currentTimestamp);
    
        // Check if the bot's name is mentioned in a new channel
        if (timeSinceLastSend === Infinity && this.isDirectlyMentioned(message.client.user.id, message)) {
            console.debug('[calcBaseChance] Bot name mentioned in new channel, setting base chance to 1 (100%)');
            return 1; // 100% chance when bot name is mentioned in a new channel
        }
    
        // For existing channels, use the time-based chance calculation
        if (timeSinceLastSend !== Infinity) {
            for (let [duration, chance] of this.timeVsResponseChance) {
                console.debug(`[calcBaseChance] Checking: timeSinceLastSend (${timeSinceLastSend}ms) <= duration (${duration}ms)`);
                if (timeSinceLastSend <= duration) {
                    console.debug(`[calcBaseChance] Interval selected: less than ${duration}ms, setting base chance to ${chance}`);
                    return chance;
                }
            }
        }
    
        return 0; // Default to 0% if none of the conditions apply
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
    
        // Calculate the response chance
        const responseChance = baseChance + 
            (message.content.endsWith('?') || message.content.endsWith('!') ? this.interrobangBonus : 0);
    
        // Make a decision based on the response chance
        const decision = Math.random() < responseChance;
    
        // If deciding to reply, increment the reply count
        if (decision) {
            this.lastReplyTimes.incrementReplyCount(message.channel.id);
        }
    
        return decision;
    }    

    isDirectlyMentioned(ourUserId, message) {
        // Check if the message mentions our bot user ID
        return message.mentions.has(ourUserId) ||
               this.llmWakewords.some(wakeword => message.content.includes(wakeword.trim()));
    }

    shouldReplyToMessage(ourUserId, message) {
        try {
            // Log the message to keep track of recent messages for each channel
            this.logMessage(message);
    
            // Calculate the base chance of sending an unsolicited reply
            let baseChance = this.provideUnsolicitedReplyInChannel(ourUserId, message);
    
            // If our bot is directly mentioned in the message, increase the chance by adding the mention bonus
            if (this.isDirectlyMentioned(ourUserId, message)) {
                baseChance += this.mentionBonus;
            }
    
            // If the message author is a bot, reduce the chance of replying.
            if (message.author.bot) {
                baseChance = Math.max(0, baseChance - this.botResponsePenalty);
            }
    
            // Make a random decision to reply or not, based on the calculated chance
            const decision = Math.random() < baseChance;
    
            // Log the final decision and the chance for debugging and monitoring purposes
            console.log(`[DecideToRespond] Decision: ${decision}, Chance: ${baseChance}`);
    
            // Return the decision (true for reply, false for no reply)
            return decision;
        } catch (error) {
            // Log any errors that occur in the decision-making process
            console.error(`[Error] in shouldReplyToMessage: ${error.message}`);
            console.error(`Error Details: `, error);
    
            // In case of error, default to not replying
            return false;
        }
    }
            
    logMention(channelId, sendTimestamp) {
        try {
            this.lastReplyTimes.times[channelId] = sendTimestamp;
            logger.debug(`[logMention] Logged mention for channel ${channelId}. Current state:`, this.lastReplyTimes.times);
        } catch (error) {
            logger.error("[Error] Error in logging mention:", error); // Optimistic logging
        }
    }

}

module.exports = { DecideToRespond };
