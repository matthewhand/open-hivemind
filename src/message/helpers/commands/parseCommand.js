"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommand = parseCommand;
const debug_1 = __importDefault(require("debug"));
const llmConfig_1 = __importDefault(require("@llm/interfaces/llmConfig"));
const debug = (0, debug_1.default)('app:parseCommand');
/**
 * Parses a command message, extracting the command name, action, and arguments.
 *
 * This function processes the content of a message to identify the command name, action, and any provided arguments.
 * It is used to standardize the format of commands received through the chat, allowing for more consistent handling.
 *
 * @param commandContent - The content of the message to parse.
 * @returns {ParsedCommand | null} The parsed command object, or null if parsing failed.
 */
function parseCommand(commandContent) {
    if (!commandContent) {
        debug('No command content provided to parseCommand');
        return null;
    }
    debug('Attempting to parse command content: ' + commandContent);
    // Define regex for command parsing: !commandName:action args
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);
    if (matches) {
        const [, commandName, action = '', args = ''] = matches.map(match => (match === null || match === void 0 ? void 0 : match.trim()) || '');
        debug('Parsed command - Name: ' + commandName + '  Action: ' + action + ', Args: ' + args);
        return { commandName: commandName.toLowerCase(), action, args };
    }
    else {
        // Improvement: Use convict configuration directly
        const defaultCommand = llmConfig_1.default.get('LLM_PROVIDER');
        const argsWithoutMention = commandContent.replace(/<@!?\\d+>\\s*/, '').trim();
        if (defaultCommand && argsWithoutMention) {
            debug('Fallback to default command: ' + defaultCommand + ' with args: ' + argsWithoutMention);
            return { commandName: defaultCommand, action: '', args: argsWithoutMention };
        }
    }
    debug('Command content did not match expected pattern and no default command could be applied.');
    return null;
}
