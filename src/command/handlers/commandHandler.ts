import Debug from "debug";

export interface CommandDetails {
    command: string;
    args: string[];
}

export interface CommandRepository {
    [key: string]: any;
}

export interface AliasMapping {
    [key: string]: string;
}

/**
 * Executes a command based on the parsed command details.
 * @param commandDetails - Parsed details of the command.
 * @param commands - Available commands to execute.
 * @param aliases - Mapping of command aliases.
 * @returns The result of the command execution.
 */
export async function executeParsedCommand(
    commandDetails: CommandDetails | null,
    commands: CommandRepository,
    aliases: AliasMapping
): Promise<{ success: boolean; message?: string; error?: string; result?: any }> {
    if (!commandDetails) {
        debug('executeParsedCommand: No command details provided');
        return { success: false, message: 'Invalid command syntax.', error: 'No command details provided.' };
    }
    const { command, args } = commandDetails;
    const commandName = aliases[command] || command;
    const commandInstance = commands[commandName];
    if (!commandInstance) {
        debug(`executeParsedCommand: Command not found - ${commandName}`);
        return { success: false, message: 'Command not found.', error: 'Command implementation missing.' };
    }
    try {
        const result = await commandInstance.execute(args);
        debug(`executeParsedCommand: Command executed - ${commandName}`);
        return { success: true, result };
    } catch (error: any) {
        debug(`executeParsedCommand: Error executing command - ${commandName}: ${error.message}`);
        return { success: false, message: 'Error executing command.', error: error.message };
    }
}
