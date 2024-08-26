import Debug from "debug";


/**
 * Starts a typing indicator in a Discord channel, refreshing every 15 seconds.
 * 
 * @param channel - The Discord channel where the typing indicator will be shown.
 * @returns A NodeJS.Timeout object that can be used to clear the interval.
 */
export function startTypingIndicator(channel: any): NodeJS.Timeout {
    if (!channel || typeof channel.sendTyping !== 'function') {
        debug('Invalid channel object provided.');
        return null as any;
    }
    channel.sendTyping();
    const typingInterval = setInterval(() => channel.sendTyping(), 15000);
    debug('startTypingIndicator: Interval started');
    return typingInterval;
}
