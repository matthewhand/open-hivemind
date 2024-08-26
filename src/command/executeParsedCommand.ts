import Debug from "debug";

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

const debug = Debug('app:command:executeParsedCommand');

/**
 * Executes a command using the provided command details, command repository, and aliases.
 * This function handles the execution flow, including command validation, alias resolution,
 * and error handling.
 *
 * @param {CommandDetails | null} commandDetails - The command and its arguments to be executed.
 * @param {CommandRepository} commands - A repository of available command instances.
 * @param {AliasMapping} aliases - A mapping of command aliases to their respective command names.
 * @returns {Promise<{ success: boolean; message?: string; error?: string; result?: any }>} - The result of the command execution, including success status, message, and any error or result data.
 */
export async function executeParsedCommand(
    commandDetails: CommandDetails | null,
    commands: CommandRepository,
    aliases: AliasMapping
): Promise<{ success: boolean; message?: string; error?: string; result?: any }> {
    // Guard clause: Ensure command details are provided
    if (!commandDetails) {
        const errorMessage = 'executeParsedCommand: No command details provided.';
        console.error(errorMessage);
        return { success: false, message: 'Invalid command syntax.', error: errorMessage };
    }

    const { command, args } = commandDetails;
    const commandName = aliases[command] || command;
    debug(`executeParsedCommand: Resolving command '${command}' to '${commandName}' with args: ${args}`);

    const commandInstance = commands[commandName];
    if (!commandInstance) {
        const errorMessage = `executeParsedCommand: Command handler not found for '${commandName}'.`;
        console.error(errorMessage);
        return { success: false, message: 'Command handler not available.', error: errorMessage };
    }

    try {
        const result = await commandInstance.execute(args);
        debug(`executeParsedCommand: Command '${commandName}' executed successfully. Result: ${result}`);
        return { success: true, result };
    } catch (error: any) {
        const errorMessage = `executeParsedCommand: Error executing command '${commandName}'. Error: ${error.message}`;
        console.error(errorMessage);
        debug(`executeParsedCommand: Error stack trace: ${error.stack}`);
        return { success: false, message: 'Error executing command.', error: errorMessage };
    }
}
