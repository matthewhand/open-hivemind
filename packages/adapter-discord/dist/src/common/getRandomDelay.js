"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomDelay = getRandomDelay;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:getRandomDelay');
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
function getRandomDelay(min, max) {
    if (min > max || min < 0 || max < 0) {
        debug('Invalid min or max values provided for delay.');
        return 0;
    }
    const delay = (Math.random() * (max - min)) + min;
    debug('Generated random delay: ' + delay + ' ms');
    return delay;
}
