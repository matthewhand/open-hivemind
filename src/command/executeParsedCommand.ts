import logger from '@utils/logger';

interface CommandDetails {
    command: string;
    args: string[];
}

interface CommandInstance {
    execute: (args: string[]) => Promise<any>;
}

interface CommandRepository {
    [key: string]: CommandInstance;
}

interface AliasMapping {
    [key: string]: string;
}

/**
 * Executes the command using the provided command details, commands repository, and aliases.
 * @param {CommandDetails} commandDetails - An object containing the command and its arguments.
 * @param {CommandRepository} commands - A repository of available command instances.
 * @param {AliasMapping} aliases - A mapping of command aliases to their respective command names.
 * @returns {Promise<object>} - The result of the command execution, formatted as an object.
 */
export async function executeParsedCommand(
    commandDetails: CommandDetails | null,
    commands: CommandRepository,
    aliases: AliasMapping
): Promise<{ success: boolean; message?: string; error?: string; result?: any }> {
    if (!commandDetails) {
        logger.error('executeParsedCommand: commandDetails not provided');
        return { success: false, message: 'Invalid command syntax.', error: 'No command details provided.' };
    }

    const { command, args } = commandDetails;
    const commandName = aliases[command] || command;
    const commandInstance = commands[commandName];

    if (!commandInstance) {
        logger.error(`executeParsedCommand: Command not found - ${commandName}`);
        return { success: false, message: 'Command not available.', error: 'Command implementation missing.' };
    }

    try {
        const result = await commandInstance.execute(args);
        logger.debug(`executeParsedCommand: Executed command - ${commandName}, Result - ${result}`);
        return { success: true, result };
    } catch (error: any) {
        logger.error(`executeParsedCommand: Error executing command - ${commandName}, Error - ${error.message}`);
        return { success: false, message: 'Error executing command.', error: error.message };
    }
}
