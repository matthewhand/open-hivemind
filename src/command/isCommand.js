"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCommand = isCommand;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:isCommand');
/**
 * Checks if the provided text is a command.
 *
 * This function determines whether a given text string represents a command
 * by checking if it starts with the '!' character.
 *
 * @param text - The text string to check.
 * @returns True if the text is a command, false otherwise.
 */
function isCommand(text) {
    const isCmd = text.startsWith('!');
    debug('isCommand: ' + text + ' - ' + isCmd);
    return isCmd;
}
