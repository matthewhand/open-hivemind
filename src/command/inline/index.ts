import fs from 'fs';
import path from 'path';
import ICommand from '../interfaces/ICommand';
import debug from 'debug';

const log = debug('app:command:inline:index');

/**
 * Dynamically loads all command modules from the current directory, excluding index.ts itself.
 * Each command module must export an instance of a class implementing the ICommand interface.
 * This script logs all loaded commands.
 */
const commandsDirectory = __dirname;
const commandFiles = fs.readdirSync(commandsDirectory).filter(file => file.endsWith('.ts') && file !== 'index.ts');
const commands: Record<string, ICommand> = {};

commandFiles.forEach(file => {
    const filePath = path.join(commandsDirectory, file);
    const commandModule = require(filePath);
    let commandInstance: ICommand;
    if (commandModule.default && commandModule.default instanceof Object && commandModule.default.execute) {
        commandInstance = commandModule.default;
    } else if (typeof commandModule === 'function') {
        commandInstance = new commandModule();
    } else if (typeof commandModule === 'object' && commandModule !== null && commandModule.execute) {
        commandInstance = commandModule;
    } else {
        log('File ' + file + ' does not export a valid CommandHandler instance or class.');
        return;
    }
    if (commandInstance && commandInstance.name && typeof commandInstance.execute === 'function') {
        commands[commandInstance.name] = commandInstance;
        log('Dynamically loaded command: ' + commandInstance.name);
    } else {
        log('File ' + file + ' does not export a valid CommandHandler instance or class.');
    }
});

log('Dynamically loaded commands: ' + Object.keys(commands).join(', '));

export default commands;
