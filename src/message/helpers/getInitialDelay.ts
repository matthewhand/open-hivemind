import { getLastTypingTimestamp } from './timestampFunctions';
/**
 * Calculates the initial delay before sending a message based on recent activity in the channel.
 * The delay simulates the bot 'reading' the previous messages before responding.
 *
 * @param typingTimestamps - A map storing the last typing timestamps for channels.
 * @param channelId - The ID of the channel where the message will be sent.
 * @param minDelay - The minimum delay before responding (in milliseconds).
 * @param maxDelay - The maximum delay before responding (in milliseconds).
 * @returns The calculated delay time (in milliseconds).
 */
export function getInitialDelay(
    typingTimestamps: Map<string, number>,
    channelId: string,
    minDelay = 1000,
    maxDelay = 5000
): number {
    const lastTyping = getLastTypingTimestamp(typingTimestamps, channelId);
    const timeSinceLastTyping = Date.now() - lastTyping;
    debug.debug('[getInitialDelay] Time since last typing in channel ' + channelId + ': ' + timeSinceLastTyping + 'ms.');
    // Calculate delay proportionally between minDelay and maxDelay based on timeSinceLastTyping
    const delay = Math.min(maxDelay, Math.max(minDelay, timeSinceLastTyping));
    debug.debug('[getInitialDelay] Calculated delay for channel ' + channelId + ': ' + delay + 'ms.');
    return delay;
}
