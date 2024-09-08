"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectSlashCommands = collectSlashCommands;
const debug_1 = __importDefault(require("debug"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug = (0, debug_1.default)('app:collectSlashCommands');
/**
 * Collects slash commands from a specified directory.
 *
 * @param commandsPath - The path to the directory containing command files.
 * @returns An array of command objects ready to be registered with Discord.
 */
function collectSlashCommands(commandsPath) {
    debug('Collecting slash commands from directory: ' + commandsPath);
    const commands = [];
    try {
        const commandFiles = fs_1.default.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        if (commandFiles.length === 0) {
            debug('No .js command files found in directory: ' + commandsPath);
            return commands;
        }
        for (const file of commandFiles) {
            const command = require(path_1.default.join(commandsPath, file));
            if (command.data) {
                debug('Adding command: ' + JSON.stringify(command.data.toJSON()));
                commands.push(command.data.toJSON());
            }
            else {
                debug('No data found in command file: ' + file);
            }
        }
    }
    catch (error) {
        debug('Error collecting slash commands: ' + (error instanceof Error ? error.message : String(error)));
    }
    return commands;
}
