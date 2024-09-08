"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommandDetails = parseCommandDetails;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:parseCommandDetails');
/**
 * Parses the command details from a given input string.
 *
 * This function extracts the command and its arguments from a user input string.
 * It splits the string by spaces, treating the first word as the command and
 * the rest as arguments. This parsed data is returned as an object with
 * `command` and `args` properties.
 *
 * @param {string} input - The input string containing the command and arguments.
 * @returns {{command: string, args: string[]}} The parsed command and arguments.
 */
function parseCommandDetails(input) {
    debug('Parsing command details from input: ' + input);
    const [command, ...args] = input.split(' ');
    debug('Parsed command: ' + command + ', args: ' + args.join(', '));
    return { command, args };
}
