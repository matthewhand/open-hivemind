import path from 'path';
import fs from 'fs';
import logger from '@utils/logger';
import { isCommand, parseCommandDetails, executeParsedCommand } from '../command/utils/commandManagerUtils';
import { IMessage } from '../command/types/IMessage';
import { ICommand } from '../command/types/ICommand';

/**
 * Manages command operations including loading commands, parsing input texts, and executing commands.
 */
export class CommandManager {
    private commands: Record<string, ICommand>;
    private aliases: Record<string, string>;

    constructor() {
        this.commands = this.loadCommands(path.join(__dirname, '../command/inline'));
        this.aliases = require('../config/aliases');
        logger.debug('CommandManager initialized with commands and aliases.');
    }

    private loadCommands(directory: string): Record<string, ICommand> {
        const fullPath = path.resolve(__dirname, directory);
        const commandFiles = fs.readdirSync(fullPath);
        const commands: Record<string, ICommand> = {};

        commandFiles.forEach(file => {
            if (file.endsWith('.ts')) {
                const commandName = file.slice(0, -3);
                try {
                    const CommandModule = require(path.join(fullPath, file)).default;
                    let commandInstance: ICommand;
                    if (typeof CommandModule === 'function') {
                        commandInstance = new CommandModule();
                    } else if (typeof CommandModule === 'object' && CommandModule !== null) {
                        commandInstance = CommandModule;
                    } else {
                        logger.error('The command module ' + file + ' does not export a class or valid object. Export type: ' + typeof CommandModule);
                        return;
                    }
                    if (commandInstance && typeof commandInstance.execute === 'function') {
                        commands[commandName] = commandInstance;
                        logger.debug('Command loaded: ' + commandName);
                    } else {
                        logger.error('The command module ' + file + ' does not export a valid command instance. Export type: ' + typeof CommandModule);
                    }
                } catch (error: any) {
                    logger.error('Failed to load command ' + commandName + ': ' + error);
                }
            }
        });
        return commands;
    }

    async executeCommand(originalMsg: IMessage): Promise<{ success: boolean; message: string; error?: string }> {
        const text = originalMsg.getText().trim();
        if (!isCommand(text)) {
            logger.debug("Text does not start with '!', not a command.");
            return { success: false, message: "Not a command.", error: "Invalid command syntax" };
        }

        const commandDetails = parseCommandDetails(text);
        if (!commandDetails) {
            logger.error("Failed to parse command details.");
            return { success: false, message: "Parsing error.", error: "Invalid command format" };
        }

        logger.debug('Executing command: ' + commandDetails.command + ' with arguments: [' + commandDetails.args.join(', ') + ']');
        const executionResult = await executeParsedCommand(commandDetails, this.commands, this.aliases);
        if (!executionResult.success) {
            logger.error('Command execution failed: ' + executionResult.error);
        } else {
            logger.debug('Command executed successfully: ' + executionResult.result);
        }
        return executionResult;
    }
}
