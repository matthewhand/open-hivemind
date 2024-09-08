"use strict";
/**
 * Command Setup Module
 *
 * This file is responsible for dynamically loading and initializing command modules from a specified directory.
 * Each command module is expected to export a `data` object, containing metadata about the command,
 * and an `execute` function, which contains the logic for the command execution.
 *
 * The file reads all `.ts` files from the `commands` directory, loads each module, and verifies that it
 * contains the required properties (`data` and `execute`). If a module is valid, it registers the command
 * by adding it to the `commandExecutors` and `commandDataArray` objects, which are later used to execute
 * commands and provide command information.
 *
 * Debugging information is logged during the process, including details about each loaded command or any
 * issues with missing properties.
 *
 * This module exports two objects:
 * - `commandExecutors`: A record of command names mapped to their respective execution functions.
 * - `commandDataArray`: An array containing metadata for all loaded commands.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandDataArray = exports.commandExecutors = void 0;
const debug_1 = __importDefault(require("debug"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const debug = (0, debug_1.default)('app:commandSetup');
/**
 * Objects to store command executors and their associated data.
 * `commandExecutors`: A record of command names mapped to their respective execution functions.
 * `commandDataArray`: An array containing metadata for all loaded commands.
 */
const commandExecutors = {};
exports.commandExecutors = commandExecutors;
const commandDataArray = [];
exports.commandDataArray = commandDataArray;
/**
 * Dynamically load command modules from the commands directory.
 * Each module is expected to export a `data` object and an `execute` function.
 * The commands directory path is constructed based on the current file's location.
 */
const commandsDirectory = path_1.default.join(__dirname, 'commands');
debug('commandsDirectory set to: ' + commandsDirectory);
try {
    const commandFiles = fs_1.default.readdirSync(commandsDirectory).filter(file => file.endsWith('.ts'));
    debug('Found command files: ' + JSON.stringify(commandFiles));
    commandFiles.forEach(file => {
        const filePath = path_1.default.join(commandsDirectory, file);
        debug('Processing command file: ' + filePath);
        try {
            const commandModule = require(filePath);
            // Add command to executors and data array if it has required properties
            if (commandModule.data && typeof commandModule.execute === 'function') {
                commandExecutors[commandModule.data.name] = commandModule.execute;
                commandDataArray.push(commandModule.data);
                debug('Dynamically loaded command: ' + commandModule.data.name + ' with data: ' + JSON.stringify(commandModule.data));
            }
            else {
                debug('CommandHandler module ' + file + ' is missing required properties.');
            }
        }
        catch (error) {
            debug('Error loading command file: ' + filePath + '. Error: ' + (error.message || error.toString()));
        }
    });
    console.info('Commands setup file loaded.');
    console.info('Commands initialized.');
}
catch (error) {
    debug('Failed to load commands from directory: ' + commandsDirectory + '. Error: ' + (error.message || error.toString()));
}
