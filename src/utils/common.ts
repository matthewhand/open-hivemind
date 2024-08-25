/**
 * Splits a message into chunks of a specified maximum length, ensuring no split occurs in the middle of a word.
 * 
 * @param message - The message to be split.
 * @param maxLength - The maximum length of each chunk. Defaults to 2000 characters.
 * @returns An array of message chunks.
 */
export function splitMessage(message: string, maxLength: number = 2000): string[] {
    if (!message || maxLength <= 0) {
        console.warn('Invalid message or maxLength provided.');
        return [];
    }
    const messageParts = message.match(new RegExp('.{1,' + maxLength + '}(\s|$)', 'g')) || [];
    console.debug('splitMessage: '  messageParts);
    return messageParts;
}
/**
 * Generates a random delay between a specified minimum and maximum value.
 * 
 * @param min - The minimum delay in milliseconds.
 * @param max - The maximum delay in milliseconds.
 * @returns A random delay in milliseconds.
 */
export function getRandomDelay(min: number, max: number): number {
    if (min > max || min < 0 || max < 0) {
        console.warn('Invalid min or max values provided for delay.');
        return 0;
    }
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.debug('getRandomDelay: '  delay);
    return delay;
}
/**
 * Starts a typing indicator in a Discord channel, refreshing every 15 seconds.
 * 
 * @param channel - The Discord channel where the typing indicator will be shown.
 * @returns A NodeJS.Timeout object that can be used to clear the interval.
 */
export function startTypingIndicator(channel: any): NodeJS.Timeout {
    if (!channel || typeof channel.sendTyping !== 'function') {
        console.warn('Invalid channel object provided.');
        return null as any;
    }
    channel.sendTyping();
    const typingInterval = setInterval(() => channel.sendTyping(), 15000);
    console.debug('startTypingIndicator: Interval started');
    return typingInterval;
}
