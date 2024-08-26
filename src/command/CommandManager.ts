/**
 * CommandManager.ts
 * 
 * This file is responsible for managing and executing commands within the application.
 * It loads available command modules dynamically and executes them based on user input.
 * 
 * Key Responsibilities:
 * - Load command modules from the specified directory.
 * - Execute commands based on user input, with proper validation and error handling.
 * - Provide debug logging to trace command execution and identify issues.
 * 
 * Improvements:
 * - Added guard clauses to handle edge cases.
 * - Enhanced debugging with detailed value logs.
 * - Ensured the code maintains functionality while being more robust.
 */

import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:CommandManager');

export class CommandManager {
    private commands: Record<string, any> = {};
    private commandsDirectory: string;

    constructor(commandsDirectory: string) {
        if (!commandsDirectory || typeof commandsDirectory !== 'string') {
            throw new Error('Invalid commands directory provided.');
        }
        this.commandsDirectory = commandsDirectory;
        debug('Initialized CommandManager with directory: ' + this.commandsDirectory);
        this.loadCommands();
    }

    private loadCommands(): void {
        try {
            const files = fs.readdirSync(this.commandsDirectory);
            debug('Loading commands from directory: ' + this.commandsDirectory);

            files.forEach(file => {
                const filePath = path.join(this.commandsDirectory, file);
                const commandName = path.basename(file, '.js');
                try {
                    const commandModule = require(filePath);
                    this.commands[commandName] = commandModule;
                    debug('Loaded command: ' + commandName);
                } catch (error) {
                    debug('Failed to load command: ' + commandName + ' from file: ' + filePath + '. Error: ' + (error instanceof Error ? error.message : String(error)));
                }
            });
        } catch (error) {
            debug('Error reading commands directory: ' + (error instanceof Error ? error.message : String(error)));
            throw new Error('Failed to load commands from directory.');
        }
    }

    public executeCommand(commandName: string, ...args: any[]): any {
        if (!commandName || typeof commandName !== 'string') {
            debug('Invalid command name provided: ' + commandName);
            throw new Error('Invalid command name provided.');
        }
        const command = this.commands[commandName];
        if (!command) {
            debug('Command not found: ' + commandName);
            throw new Error('Command not found: ' + commandName);
        }
        try {
            debug('Executing command: ' + commandName + ' with arguments: ' + JSON.stringify(args));
            return command.execute(...args);
        } catch (error) {
            debug('Error executing command: ' + commandName + '. Error: ' + (error instanceof Error ? error.message : String(error)));
            throw new Error('Failed to execute command: ' + commandName);
        }
    }
}
