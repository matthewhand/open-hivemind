import path from 'path';
import fs from 'fs';
import Debug from 'debug';
import { isCommand } from './isCommand';
import { parseCommandDetails } from './parseCommandDetails';
import { executeParsedCommand } from './executeParsedCommand';
import { IMessage } from '../message/interfaces/IMessage';
import ICommand from '@src/command/interfaces/ICommand';
const debug = Debug('app:command:CommandManager');
/**
 * Manages command operations including loading commands, parsing input texts, and executing commands.
 */
export class CommandManager {
    private commands: Record<string, ICommand>;
    private aliases: Record<string, string>;
    private debug: Debug.Debugger;
    constructor() {
        this.commands = this.loadCommands(path.join(__dirname, '../command/inline'));
        this.aliases = require('@config/aliases');
        this.debug = Debug('app:command:CommandManager');
        this.debug('CommandManager initialized with commands and aliases.');
    }
    /**
     * Loads all command modules from the specified directory.
     * @param directory The directory containing command modules.
     * @returns A record of command names to their respective ICommand instances.
     */
    private loadCommands(directory: string): Record<string, ICommand> {
        const fullPath = path.resolve(__dirname, directory);
        const commandFiles = fs.readdirSync(fullPath);
        const commands: Record<string, ICommand> = {};
        commandFiles.forEach(file => {
            if (file.endsWith('.ts')) {
                const commandName = file.slice(0, -3); // Remove the .ts extension to get the command name
                try {
                    const CommandModule = require(path.join(fullPath, file)).default;
                    let commandInstance: ICommand;
                    if (typeof CommandModule === 'function') {
                        commandInstance = new CommandModule();
                    } else if (typeof CommandModule === 'object' && CommandModule !== null) {
                        commandInstance = CommandModule;
                    } else {
                        debug('The command module ' + file + ' does not export a class or valid object. Export type: ' + typeof CommandModule);
                        return;
                    }
                    if (commandInstance && typeof commandInstance.execute === 'function') {
                        commands[commandName] = commandInstance;
                        this.debug('CommandHandler loaded: ' + commandName);
                    } else {
                        debug('The command module ' + file + ' does not export a valid command instance. Export type: ' + typeof CommandModule);
                    }
                } catch (error: any) {
                    debug('Failed to load command ' + commandName + ': ' + error.message);
                }
            }
        });
        return commands;
    }
    /**
     * Executes a command based on the provided message.
     * @param originalMsg The original message containing the command.
     * @returns The result of the command execution.
     */
    async executeCommand(originalMsg: IMessage): Promise<{ success: boolean; message: string; error?: string }> {
        const text = originalMsg.getText().trim();
        // Check if the message is a command
        if (!isCommand(text)) {
            this.debug("Text does not start with '!'  not a command.");
            return { success: false, message: 'Not a command.', error: 'Invalid command syntax' };
        }
        // Parse the command details
        const commandDetails = parseCommandDetails(text);
        if (!commandDetails) {
            debug('Failed to parse command details.');
            return { success: false, message: 'Parsing error.', error: 'Invalid command format' };
        }
        this.debug('Executing command: ' + commandDetails.command + ' with arguments: [' + commandDetails.args.join('  ') + ']');
        // Execute the parsed command
        const executionResult = await executeParsedCommand(commandDetails, this.commands, this.aliases);
        if (!executionResult.success) {
            debug('CommandHandler execution failed: ' + executionResult.error);
        } else {
            this.debug('CommandHandler executed successfully: ' + executionResult.result);
        }
        // Ensure `message` is always a string
        return {
            ...executionResult,
            message: executionResult.message || 'Operation completed.'
        };
    }
}
export default CommandManager;
