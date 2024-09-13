import { ConfigurationManager } from '@config/ConfigurationManager';
// import constants from '@config/constants';
import Debug from 'debug';

const debug = Debug('app:shouldReplyToMessage');
const configManager = ConfigurationManager.getInstance();

/**
 * Merged function to determine whether to reply to a message.
 * Integrates unsolicited message handling with chance-based logic and time decay.
 * 
 * @param {any} message - The Discord message object.
 * @param {string} botId - The ID of the bot.
 * @param {string} integration - The name of the integration (e.g., 'discord').
 * @param {number} timeSinceLastActivity - The time in milliseconds since the last activity in the channel.
 * @returns {boolean} - Whether to respond or not.
 */
export function shouldReplyToMessage(message: any, botId: string, integration: string, timeSinceLastActivity: number = 10000): boolean {
    const channelId = message.getChannelId();

    // Check if the bot has previously spoken in this channel
    const botSpokenBefore = process.env[`SESSION_${integration.toUpperCase()}_${channelId}`];

    // Check if the message is a direct query (contains @botId or is a reply)
    const isDirectQuery = message.isMentioning(botId) || message.isReply();

    // If bot has never spoken in the channel and it's not a direct query, don't reply
    if (!botSpokenBefore && !isDirectQuery) {
        debug('Bot has not spoken before and the message is not a direct query.');
        return false;
    }

    // Restore chance-based logic from older version
    let chance = calculateBaseChance(messengerService.getClientId(), message, timeSinceLastActivity);
    const decision = Math.random() < chance;
    debug(`Should send response (random < chance): ${decision} (${Math.random()} < ${chance})`);
    
    // If replying, mark the bot as having spoken in the channel (optional tracking can be added)
    process.env[`SESSION_${integration.toUpperCase()}_${channelId}`] = 'active';

    return decision;
}

/**
 * Calculates the base probability of responding to a given message, factoring in message content, special conditions, and activity decay.
 * 
 * @param {any} message - The message object to evaluate.
 * @param {number} timeSinceLastActivity - Time in milliseconds since the last activity, used to calculate decay.
 * @returns {number} - The calculated chance of responding (between 0 and 1).
 */
function calculateBaseChance(clientId: string, message: any, timeSinceLastActivity: number): number {
    if (message.getAuthorId() === messengerService.getClientId()) {
        debug("Not responding to self-generated messages.");
        return 0;
    }

    let chance = 0;
    const text = message.getText().toLowerCase();

    // Wakeword logic (default to '!help,!ping' if no env variable)
    const wakewords = process.env.MESSAGE_WAKEWORDS ? process.env.MESSAGE_WAKEWORDS.split(',') : ['!help', '!ping'];
    if (wakewords.some(wakeword => text.startsWith(wakeword))) {
        debug("Wakeword found, responding immediately.");
        return 1; // Guaranteed response if wakeword is matched
    }

    // Interrobang and mention bonuses (using env variables with defaults)
    if (/[!?]/.test(text.slice(1))) {
        chance += parseFloat(process.env.MESSAGE_INTERROBANG_BONUS || '0.1');
    }
    if (text.includes(messengerService.getClientId())) {
        chance += parseFloat(process.env.MESSAGE_MENTION_BONUS || '0.5');
    }

    // Bot response modifier (reduce chance if it's a bot message)
    if (message.isFromBot()) {
        chance += parseFloat(process.env.MESSAGE_BOT_RESPONSE_MODIFIER || '-1.0');
    }

    // Priority channel bonus
    const priorityChannel = process.env.MESSAGE_PRIORITY_CHANNEL;
    if (message.getChannelId() === priorityChannel) {
        chance += parseFloat(process.env.MESSAGE_PRIORITY_CHANNEL_BONUS || '0.8');
    }

    // Time decay factor based on recent activity
    const recentActivityDecayRate = parseFloat(process.env.MESSAGE_RECENT_ACTIVITY_DECAY_RATE || '0.5');
    const activityTimeWindow = parseInt(process.env.MESSAGE_ACTIVITY_TIME_WINDOW || '300000', 10);
    const decayFactor = Math.exp(-recentActivityDecayRate * (timeSinceLastActivity / activityTimeWindow));
    chance *= decayFactor;

    return Math.min(chance, 1);
}

