import Debug from 'debug';
const debug = Debug('app:utils:getRandomDelay');

/**
 * Generates a random delay between a specified minimum and maximum value.
 * 
 * @param min - The minimum delay in milliseconds.
 * @param max - The maximum delay in milliseconds.
 * @returns A random delay in milliseconds.
 */
export function getRandomDelay(min: number, max: number): number {
    if (min > max || min < 0 || max < 0) {
        debug('Invalid min or max values provided for delay.');
        return 0;
    }
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    debug('getRandomDelay: ' + delay);
    return delay;
}
