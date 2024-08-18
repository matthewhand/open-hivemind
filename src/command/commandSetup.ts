import fs from 'fs';
import path from 'path';
import logger from '@utils/logger';

interface CommandModule {
    data: {
        name: string;
        description: string;
        [key: string]: any;
    };
    execute: (...args: any[]) => void;
}

const commandExecutors: Record<string, Function> = {};
const commandDataArray: CommandModule['data'][] = [];

// Dynamically load command modules
const commandsDirectory = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsDirectory).filter(file => file.endsWith('.ts'));

commandFiles.forEach(file => {
    const filePath = path.join(commandsDirectory, file);
    const commandModule: CommandModule = require(filePath);

    // Add command to executors and data array if it has required properties
    if (commandModule.data && typeof commandModule.execute === 'function') {
        commandExecutors[commandModule.data.name] = commandModule.execute;
        commandDataArray.push(commandModule.data);
        logger.debug('Dynamically loaded command: ' + commandModule.data.name + ' with data:', commandModule.data);
    } else {
        logger.warn('[WARNING] Command module ' + file + ' is missing required properties.');
    }
});

console.info('Commands setup file loaded.');
console.info('Commands initialized.');

export { commandExecutors, commandDataArray };
