const configurationManager = require('../config/configurationManager');
const logger = require('../utils/logger');
const messageResponseUtils = require('../utils/messageResponseUtils');
const constants = require('../config/constants');
// Ensure DiscordMessage is correctly imported, adjust path as necessary
const DiscordMessage = require('../models/DiscordMessage'); 

class MessageResponseManager {
    constructor() {
        logger.debug('Initializing MessageResponseManager with default configuration.');
        try {
            this.config = configurationManager.getConfig('messageResponse') || this.defaultConfig();
            this.setupConfig();
            logger.debug(`MessageResponseManager configuration: ${JSON.stringify(this.config)}`);
        } catch (error) {
            logger.error(`Error initializing MessageResponseManager: ${error.message}`);
        }
    }

    defaultConfig() {
        logger.debug('Loading default configuration for MessageResponseManager.');
        return {
            interrobangBonus: 0.2,
            mentionBonus: 0.4,
            botResponsePenalty: 0.6,
            timeVsResponseChance: [[12345, 0.4], [420000, 0.6], [4140000, 0.2]],
            llmWakewords: [],
            unsolicitedChannelCap: 5,
        };
    }

    setupConfig() {
        logger.debug('Setting up configuration for MessageResponseManager.');
        this.interrobangBonus = this.config.interrobangBonus;
        this.mentionBonus = this.config.mentionBonus;
        this.botResponsePenalty = this.config.botResponsePenalty;
        this.timeVsResponseChance = this.config.timeVsResponseChance;
        this.llmWakewords = this.config.llmWakewords;
        this.unsolicitedChannelCap = this.config.unsolicitedChannelCap;
    }


    shouldReplyToMessage(discordMessage) {
        try {
            if (!(discordMessage instanceof DiscordMessage)) {
                logger.debug('Invalid message object type. (returning false - 0%)');
                return { shouldReply: false, responseChance: 0 };
            }

            const channelId = discordMessage.getChannelId();
            const isMentioned = discordMessage.mentionsUsers();
            const isReply = discordMessage.isReply();

            if (isMentioned || isReply || channelId === constants.CHANNEL_ID) {
                let baseChance = this.calcBaseChanceOfUnsolicitedReply(channelId);
                baseChance += this.calculateBonusForMessageContent(discordMessage.getText());

                if (isMentioned) {
                    baseChance += this.mentionBonus;
                    logger.debug(`Increased chance of reply due to direct mention: ${baseChance}`);
                }

                if (discordMessage.isFromBot()) {
                    baseChance = Math.max(0, baseChance - this.botResponsePenalty);
                    logger.debug(`Adjusted chance of reply due to author being a bot: ${baseChance}`);
                }

                const shouldReply = Math.random() < baseChance;
                logger.debug(`Decision to reply: ${shouldReply} (chance: ${baseChance})`);

                const responseChance = shouldReply ? 1 : baseChance;
                return { shouldReply, responseChance };
            } else {
                logger.debug(`Message in channel ${channelId} does not meet criteria for reply.`);
                return { shouldReply: false, responseChance: 0 };
            }
        } catch (error) {
            logger.error(`Error evaluating if should reply to message: ${error.message}`);
            return { shouldReply: false, responseChance: 0 };
        }
    }

    calcBaseChanceOfUnsolicitedReply(channelId) {
        const timeSinceLastReply = messageResponseUtils.getTimeSinceLastReply(channelId);
        logger.debug(`Time since last reply for channel ${channelId}: ${timeSinceLastReply}`);
        
        for (let [duration, chance] of this.timeVsResponseChance) {
            if (timeSinceLastReply <= duration) {
                logger.debug(`Base chance of reply based on time since last reply: ${chance}`);
                return chance;
            }
        }
        logger.debug('No base chance of reply based on time thresholds; returning 0.');
        return 0;
    }

    calculateBonusForMessageContent(message) {
        let bonus = 0;
        if (message.content.includes('!')) {
            bonus += this.interrobangBonus;
            logger.debug(`Content bonus added for interrobang: ${this.interrobangBonus}`);
        }
        // Implement additional content checks here
        return bonus;
    }
}

const messageResponseManager = new MessageResponseManager();
module.exports = messageResponseManager;
