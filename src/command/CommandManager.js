"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:CommandManager');
class CommandManager {
    constructor(commandsDirectory) {
        this.commands = {};
        if (!commandsDirectory || typeof commandsDirectory !== 'string') {
            throw new Error('Invalid commands directory provided.');
        }
        this.commandsDirectory = commandsDirectory;
        debug('Initialized CommandManager with directory: ' + this.commandsDirectory);
        this.loadCommands();
    }
    loadCommands() {
        try {
            const files = fs_1.default.readdirSync(this.commandsDirectory);
            debug('Loading commands from directory: ' + this.commandsDirectory);
            files.forEach(file => {
                const filePath = path_1.default.join(this.commandsDirectory, file);
                const commandName = path_1.default.basename(file, '.js');
                try {
                    const commandModule = require(filePath);
                    this.commands[commandName] = commandModule;
                    debug('Loaded command: ' + commandName);
                }
                catch (error) {
                    debug('Failed to load command: ' + commandName + ' from file: ' + filePath + '. Error: ' + (error instanceof Error ? error.message : String(error)));
                }
            });
        }
        catch (error) {
            debug('Error reading commands directory: ' + (error instanceof Error ? error.message : String(error)));
            throw new Error('Failed to load commands from directory.');
        }
    }
    executeCommand(commandName, ...args) {
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
        }
        catch (error) {
            debug('Error executing command: ' + commandName + '. Error: ' + (error instanceof Error ? error.message : String(error)));
            throw new Error('Failed to execute command: ' + commandName);
        }
    }
}
exports.CommandManager = CommandManager;
