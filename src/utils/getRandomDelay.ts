import Debug from "debug";

const debug = Debug('app:getRandomDelay');

/**
 * Generates a random delay between a specified minimum and maximum value.
 *
 * This function returns a random delay within the provided range, useful for
 * simulating network latency or adding variability to bot responses.
 *
 * @param {number} min - The minimum delay in milliseconds.
 * @param {number} max - The maximum delay in milliseconds.
 * @returns {number} A random delay in milliseconds.
 */
export function getRandomDelay(min: number, max: number): number {
    if (min > max || min < 0 || max < 0) {
        debug('Invalid min or max values provided for delay.');
        return 0;
    }
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    debug('Generated random delay: ' + delay + ' ms');
    return delay;
}
