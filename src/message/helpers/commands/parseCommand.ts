import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:parseCommand');
const configManager = ConfigurationManager.getInstance();

// Define explicit type for llmConfig
interface LlmConfig {
    LLM_PROVIDER?: string;
}

// Fix: Correctly initialize llmConfig without calling non-existent get method
const llmConfig: LlmConfig = configManager?.LLM_PROVIDER ? { LLM_PROVIDER: configManager.LLM_PROVIDER } : {};

interface ParsedCommand {
    commandName: string;
    action: string;
    args: string;
}

/**
 * Parses a command message, extracting the command name, action, and arguments.
 *
 * This function processes the content of a message to identify the command name, action, and any provided arguments. 
 * It is used to standardize the format of commands received through the chat, allowing for more consistent handling.
 *
 * @param commandContent - The content of the message to parse.
 * @returns {ParsedCommand | null} The parsed command object, or null if parsing failed.
 */
export function parseCommand(commandContent: string): ParsedCommand | null {
    if (!commandContent) {
        debug('No command content provided to parseCommand');
        return null;
    }
    debug('Attempting to parse command content: ' + commandContent);

    // Define regex for command parsing: !commandName:action args
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const [, commandName, action = '', args = ''] = matches.map(match => match?.trim() || '');
        debug('Parsed command - Name: ' + commandName + '  Action: ' + action + ', Args: ' + args);
        return { commandName: commandName.toLowerCase(), action, args };
    } else {
        // Improvement: More verbose debug logging for fallback mechanism
        debug('LLM configuration unavailable or command did not match regex pattern.');
        if (!llmConfig || !llmConfig.LLM_PROVIDER) {
            debug('LLM configuration is not loaded.');
            return null;
        }

        const defaultCommand = llmConfig.LLM_PROVIDER as string;
        const argsWithoutMention = commandContent.replace(/<@!?\d+>\s*/, '').trim();
        if (defaultCommand && argsWithoutMention) {
            debug('Fallback to default command: ' + defaultCommand + ' with args: ' + argsWithoutMention);
            return { commandName: defaultCommand, action: '', args: argsWithoutMention };
        }
    }

    debug('Command content did not match expected pattern and no default command could be applied.');
    return null;
}
