import Debug from 'debug';
import fs from 'fs';
import path from 'path';
import { HivemindError, ErrorUtils } from '@src/types/errors';

const debug = Debug('app:collectSlashCommands');

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
  debug('Collecting slash commands from directory: ' + commandsPath);
  const commands: object[] = [];
  try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    if (commandFiles.length === 0) {
      debug('No .js command files found in directory: ' + commandsPath);
      return commands;
    }
    for (const file of commandFiles) {
      const command: CommandHandler = require(path.join(commandsPath, file));
      if (command.data) {
        debug('Adding command: ' + JSON.stringify(command.data.toJSON()));
        commands.push(command.data.toJSON());
      } else {
        debug('No data found in command file: ' + file);
      }
    }
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Error collecting slash commands: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord collect slash commands error:', hivemindError);
    }
  }
  return commands;
}
