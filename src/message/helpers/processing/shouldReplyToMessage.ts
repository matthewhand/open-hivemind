import Debug from 'debug';
import { ConfigurationManager } from '@src/config/ConfigurationManager';
const debug = Debug('app:shouldReplyToMessage');
const configManager = ConfigurationManager.getInstance();

/**
 * Determines whether the bot should reply to a given message.
 * @param {any} message - The message object received.
 * @param {string} botId - The ID of the bot.
 * @param {string} integration - The name of the integration (e.g., 'discord').
 * @param {number} timeSinceLastActivity - The time since the last activity in the channel.
 * @returns {boolean} Whether the bot should reply or not.
 */
export function shouldReplyToMessage(message: any, botId: string, integration: string, timeSinceLastActivity: number = 10000): boolean {
    const channelId = message.getChannelId();

    // Check if the bot has spoken before in the channel
    const botSpokenBefore = process.env[`SESSION_${integration.toUpperCase()}_${channelId}`];
    const isDirectQuery = message.mentionsUsers(botId) || message.isReplyToBot();

    if (!botSpokenBefore && !isDirectQuery) {
        debug('Bot has not spoken before and the message is not a direct query.');
        return false;
    }

    let chance = calculateBaseChance(message, timeSinceLastActivity);
    const decision = Math.random() < chance;
    debug(`Should send response (random < chance): ${decision} (${Math.random()} < ${chance})`);
    return decision;
}

/**
 * Calculates the base chance of responding to a message.
 * @param {any} message - The message object to evaluate.
 * @param {number} timeSinceLastActivity - Time in milliseconds since the last activity in the channel.
 * @returns {number} The calculated chance of responding (between 0 and 1).
 */
function calculateBaseChance(message: any, timeSinceLastActivity: number): number {
    if (message.getAuthorId() === process.env.DISCORD_CLIENT_ID) {
        debug('Not responding to self-generated messages.');
        return 0;
    }

    let chance = 0;
    const text = message.getText().toLowerCase();
    const wakewords = process.env.MESSAGE_WAKEWORDS ? process.env.MESSAGE_WAKEWORDS.split(',') : ['!help', '!ping'];
    if (wakewords.some(wakeword => text.startsWith(wakeword))) {
        debug('Wakeword found, responding immediately.');
        return 1;
    }

    if (/[!?]/.test(text.slice(1))) {
        chance += parseFloat(process.env.MESSAGE_INTERROBANG_BONUS || '0.1');
    }
    if (text.includes(process.env.DISCORD_CLIENT_ID)) {
        chance += parseFloat(process.env.MESSAGE_MENTION_BONUS || '0.5');
    }

    if (message.isFromBot()) {
        chance += parseFloat(process.env.MESSAGE_BOT_RESPONSE_MODIFIER || '-1.0');
    }

    const priorityChannel = process.env.MESSAGE_PRIORITY_CHANNEL;
    if (message.getChannelId() === priorityChannel) {
        chance += parseFloat(process.env.MESSAGE_PRIORITY_CHANNEL_BONUS || '0.8');
    }

    const recentActivityDecayRate = parseFloat(process.env.MESSAGE_RECENT_ACTIVITY_DECAY_RATE || '0.5');
    const activityTimeWindow = parseInt(process.env.MESSAGE_ACTIVITY_TIME_WINDOW || '300000', 10);
    const decayFactor = Math.exp(-recentActivityDecayRate * (timeSinceLastActivity / activityTimeWindow));
    chance *= decayFactor;

    return Math.min(chance, 1);
}
