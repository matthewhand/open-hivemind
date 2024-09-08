"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('app:command:inline:index');
/**
 * Dynamically loads all command modules from the current directory, excluding index.ts itself.
 * Each command module must export an instance of a class implementing the ICommand interface.
 * This script logs all loaded commands.
 */
const commandsDirectory = __dirname;
const commandFiles = fs_1.default.readdirSync(commandsDirectory).filter(file => file.endsWith('.ts') && file !== 'index.ts');
const commands = {};
commandFiles.forEach(file => {
    const filePath = path_1.default.join(commandsDirectory, file);
    const commandModule = require(filePath);
    let commandInstance;
    if (commandModule.default && commandModule.default instanceof Object && commandModule.default.execute) {
        commandInstance = commandModule.default;
    }
    else if (typeof commandModule === 'function') {
        commandInstance = new commandModule();
    }
    else if (typeof commandModule === 'object' && commandModule !== null && commandModule.execute) {
        commandInstance = commandModule;
    }
    else {
        log('File ' + file + ' does not export a valid CommandHandler instance or class.');
        return;
    }
    if (commandInstance && commandInstance.name && typeof commandInstance.execute === 'function') {
        commands[commandInstance.name] = commandInstance;
        log('Dynamically loaded command: ' + commandInstance.name);
    }
    else {
        log('File ' + file + ' does not export a valid CommandHandler instance or class.');
    }
});
log('Dynamically loaded commands: ' + Object.keys(commands).join(', '));
exports.default = commands;
