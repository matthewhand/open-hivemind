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
    constructor(discordSettings) {
        console.log("DecideToRespond Constructor: Initializing...");

        this.discordSettings = discordSettings;

        // Default values
        const defaultTimeVsResponseChance = [[12345, 0.05], [420000, 0.75], [4140000, 0.1]];
        const defaultInterrobangBonus = 0.2;
        const defaultMentionBonus = 0.2;
        const defaultBotResponsePenalty = 0.4;

        // Environment variables or default values
        this.interrobangBonus = parseFloat(process.env.INTERROBANG_BONUS || defaultInterrobangBonus);
        this.mentionBonus = parseFloat(process.env.MENTION_BONUS || defaultMentionBonus);
        this.botResponsePenalty = parseFloat(process.env.BOT_RESPONSE_CHANGE_PENALTY || defaultBotResponsePenalty);

        let timeVsResponseChance;
        try {
            timeVsResponseChance = JSON.parse(process.env.TIME_VS_RESPONSE_CHANCE || JSON.stringify(defaultTimeVsResponseChance));
        } catch (e) {
            console.error("Error parsing TIME_VS_RESPONSE_CHANCE, using default values:", e);
            timeVsResponseChance = defaultTimeVsResponseChance;
        }

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
            // Log the received message for analysis
            logger.debug(`[shouldReplyToMessage] Received message: ${message.content}`);
            logger.debug(`[shouldReplyToMessage] From user: ${message.author.id}, Bot User ID: ${ourUserId}`);
    
            // Log the initial message logging step
            this.logMessage(message);
            logger.debug(`[shouldReplyToMessage] Logged the message in recent messages count`);
    
            // Calculate and log base chance of reply
            let baseChance = this.provideUnsolicitedReplyInChannel(ourUserId, message);
            logger.debug(`[shouldReplyToMessage] Base chance of reply (before penalties and bonuses): ${baseChance}`);
    
            // Check if the message is from another bot and apply penalty
            if (message.author.bot) {
                baseChance *= this.botResponsePenalty;
                logger.debug(`[shouldReplyToMessage] Message is from another bot. Bot response penalty applied. Adjusted chance: ${baseChance}`);
            }
    
            // Check if the bot is directly mentioned and apply bonus
            if (this.isDirectlyMentioned(ourUserId, message)) {
                baseChance += this.mentionBonus;
                logger.debug(`[shouldReplyToMessage] Bot is directly mentioned. Mention bonus applied. Adjusted chance: ${baseChance}`);
            }
    
            // Calculate final decision and log it
            const decision = Math.random();
            logger.debug(`[shouldReplyToMessage] Random decision value: ${decision}`);
            const shouldReply = decision < baseChance;
            logger.debug(`[shouldReplyToMessage] Should reply: ${shouldReply}`);
    
            return shouldReply;
        } catch (error) {
            // Log any errors encountered during the function execution
            logger.error(`Error in shouldReplyToMessage: ${error.message}`);
            logger.error(`Error stack: ${error.stack}`);
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
