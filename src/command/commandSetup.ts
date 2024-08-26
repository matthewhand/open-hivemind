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

import Debug from "debug";
import path from 'path';
import fs from 'fs';

const debug = Debug('app:commandSetup');

/**
 * Interface defining the structure of a command module.
 */
interface CommandModule {
    data: {
        name: string;
        description: string;
        [key: string]: any;
    };
    execute: (...args: any[]) => void;
}

/**
 * Objects to store command executors and their associated data.
 * `commandExecutors`: A record of command names mapped to their respective execution functions.
 * `commandDataArray`: An array containing metadata for all loaded commands.
 */
const commandExecutors: Record<string, Function> = {};
const commandDataArray: CommandModule['data'][] = [];

/**
 * Dynamically load command modules from the commands directory.
 * Each module is expected to export a `data` object and an `execute` function.
 * The commands directory path is constructed based on the current file's location.
 */
const commandsDirectory = path.join(__dirname, 'commands');
debug('commandsDirectory set to: ' + commandsDirectory);

try {
    const commandFiles = fs.readdirSync(commandsDirectory).filter(file => file.endsWith('.ts'));
    debug('Found command files: ' + JSON.stringify(commandFiles));

    commandFiles.forEach(file => {
        const filePath = path.join(commandsDirectory, file);
        debug('Processing command file: ' + filePath);

        try {
            const commandModule: CommandModule = require(filePath);

            // Add command to executors and data array if it has required properties
            if (commandModule.data && typeof commandModule.execute === 'function') {
                commandExecutors[commandModule.data.name] = commandModule.execute;
                commandDataArray.push(commandModule.data);
                debug('Dynamically loaded command: ' + commandModule.data.name + ' with data: ' + JSON.stringify(commandModule.data));
            } else {
                debug('CommandHandler module ' + file + ' is missing required properties.');
            }
        } catch (error: any) {
            debug('Error loading command file: ' + filePath + '. Error: ' + (error.message || error.toString()));
        }
    });

    console.info('Commands setup file loaded.');
    console.info('Commands initialized.');

} catch (error: any) {
    debug('Failed to load commands from directory: ' + commandsDirectory + '. Error: ' + (error.message || error.toString()));
}

/**
 * Exported objects for use in other parts of the application:
 * `commandExecutors` - Holds the functions to execute commands.
 * `commandDataArray` - Holds metadata for all commands.
 */
export { commandExecutors, commandDataArray };
