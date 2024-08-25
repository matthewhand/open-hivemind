import fs from 'fs';
import path from 'path';

interface CommandHandler {
    data: {
        toJSON: () => any;
    };
}

/**
 * Collects slash commands from a specified directory.
 * 
 * @param commandsPath - The path to the directory containing command files.
 * @returns An array of command objects ready to be registered with Discord.
 */
export function collectSlashCommands(commandsPath: string): object[] {
    debug.info('Collecting slash commands from directory: ' + commandsPath);
    const commands: object[] = [];

    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        if (commandFiles.length === 0) {
            debug.warn('No .js command files found in directory: ' + commandsPath);
            return commands;
        }

        for (const file of commandFiles) {
            const command: CommandHandler = require(path.join(commandsPath, file));
            if (command.data) {
                debug.debug('Adding command: ' + JSON.stringify(command.data.toJSON()));
                commands.push(command.data.toJSON());
            } else {
                debug.warn('No data found in command file: ' + file);
            }
        }
    } catch (error: any) {
        debug.error('Error collecting slash commands: ' + (error instanceof Error ? error.message : String(error)));
    }

    return commands;
}
