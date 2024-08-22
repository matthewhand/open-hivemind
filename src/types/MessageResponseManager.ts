import logger from '@src/utils/logger';
import configurationManager from '@config/configurationManager';
import constants from '@config/configurationManager';

interface IMessage {
    getText(): string;
    getChannelId(): string;
    getAuthorId(): string;
    isFromBot(): boolean;
    getUserMentions(): { id: string }[];
}

class MessageResponseManager {
    private static instance: MessageResponseManager;
    private config: Record<string, any>;
    private unsolicitedChannelCounts: Record<string, number> = {};

    private constructor() {
        this.config = this.loadConfig();
    }

    static getInstance(): MessageResponseManager {
        if (!this.instance) {
            this.instance = new MessageResponseManager();
        }
        return this.instance;
    }

    private loadConfig(): Record<string, any> {
        const defaults = {
            interrobangBonus: 0.1,
            mentionBonus: 0.5,
            botResponseModifier: -0.7,
            maxDelay: 17000,
            minDelay: 4500,
            decayRate: 0.95,
            llmWakewords: ['!help', '!ping', '!echo'],
            unsolicitedChannelCap: 2,
            priorityChannel: constants.CHANNEL_ID,
            decayThreshold: 3000,
            recentActivityDecayRate: 0.5,
            activityDecayBase: 0.5,
            activityTimeWindow: 300000,
            channelInactivityLimit: 600000,
            priorityChannelBonus: 0.6
        };
        const config = { ...defaults, ...configurationManager.getConfig('messageResponseSettings') };
        logger.debug('Configuration loaded: ', config);
        return config;
    }

    shouldReplyToMessage(message: IMessage, timeSinceLastActivity: number = 10000): boolean {
        const channelId = message.getChannelId();
        logger.debug('[MessageResponseManager] Evaluating reply possibility for message from channel ' + channelId);

        if (!this.isEligibleForResponse(message)) {
            logger.debug('[MessageResponseManager] Message is not eligible for a response.');
            return false;
        }

        if (!this.isWithinUnsolicitedLimit(channelId)) {
            logger.debug('[MessageResponseManager] Channel has exceeded the unsolicited message limit.');
            return false;
        }

        const shouldSend = this.shouldSendResponse(message, timeSinceLastActivity);
        logger.debug('[MessageResponseManager] Decision to send response: ' + shouldSend);
        return shouldSend;
    }

    private isEligibleForResponse(message: IMessage): boolean {
        const isEligible = message.getText() && !message.isFromBot();
        logger.debug('Message eligibility for response: ' + isEligible);
        return isEligible;
    }

    private isWithinUnsolicitedLimit(channelId: string): boolean {
        const isWithinLimit = channelId === this.config.priorityChannel || (this.unsolicitedChannelCounts[channelId] || 0) < this.config.unsolicitedChannelCap;
        logger.debug('Unsolicited message limit check for channel ' + channelId + ': ' + isWithinLimit);
        return isWithinLimit;
    }

    private shouldSendResponse(message: IMessage, timeSinceLastActivity: number): boolean {
        const baseChance = this.calculateBaseChance(message, timeSinceLastActivity);
        const decision = Math.random() < baseChance;
        logger.debug('Should send response (random < baseChance): ' + decision + ' (' + Math.random() + ' < ' + baseChance + ')');
        return decision;
    }

    private calculateBaseChance(message: IMessage, timeSinceLastActivity: number): number {
        if (message.getAuthorId() === constants.CLIENT_ID) {
            logger.debug('[MessageResponseManager] Not responding to self-generated messages.');
            return 0;
        }

        let chance = 0;
        const text = message.getText().toLowerCase();
        logger.debug('[MessageResponseManager] Calculating base chance for message: ' + message.getText());

        if (this.config.llmWakewords.some((wakeword: string) => text.startsWith(wakeword))) {
            logger.debug('[MessageResponseManager] Wakeword found, responding immediately.');
            return 1;
        }

        if (/[!?]/.test(text.slice(1))) {
            chance += this.config.interrobangBonus;
            logger.debug('[MessageResponseManager] Interrobang bonus applied: +' + this.config.interrobangBonus);
        }

        const mentions = message.getUserMentions();
        const isBotMentioned = mentions.some(user => user.id === constants.CLIENT_ID);

        if (isBotMentioned) {
            chance += this.config.mentionBonus;
            logger.debug('[MessageResponseManager] Mention bonus applied: +' + this.config.mentionBonus);
        } else if (mentions.length > 0) {
            chance += this.config.botResponseModifier;
            logger.debug('[MessageResponseManager] Bot response modifier applied: +' + this.config.botResponseModifier);
        }

        if (message.isFromBot()) {
            chance += this.config.botResponseModifier;
            logger.debug('[MessageResponseManager] Bot response modifier applied: +' + this.config.botResponseModifier);
        }

        if (message.getChannelId() === this.config.priorityChannel) {
            chance += this.config.priorityChannelBonus;
            logger.debug('[MessageResponseManager] Priority channel bonus applied: +' + this.config.priorityChannelBonus);
        }

        const decayFactor = Math.exp(-this.config.recentActivityDecayRate * (timeSinceLastActivity / this.config.activityTimeWindow));
        chance *= decayFactor;

        logger.debug('[MessageResponseManager] Final calculated chance after decay factor (' + decayFactor.toFixed(4) + '): ' + chance.toFixed(4));
        return Math.min(chance, 1);
    }
}

export default MessageResponseManager;
