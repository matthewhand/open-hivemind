const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class CommandManager {
    constructor() {
        this.commands = this.loadCommands('../commands/inline');
        this.aliases = require('../config/aliases');
    }

    loadCommands(directory) {
        const fullPath = path.resolve(__dirname, directory);
        const commandFiles = fs.readdirSync(fullPath);
        const commands = {};
    
        commandFiles.forEach(file => {
            if (file.endsWith('.js')) {
                const commandName = file.slice(0, -3);
                try {
                    const CommandClass = require(path.join(fullPath, file));
                    if (typeof CommandClass === 'function') {
                        const instance = new CommandClass();
                        commands[commandName] = instance;
                    } else {
                        logger.error(`The command module ${file} does not export a class.`);
                    }
                } catch (error) {
                    logger.error(`Failed to load command ${commandName}: ${error}`);
                }
            }
        });
        return commands;
    }
    
    parseCommand(text) {
        const match = text.match(/!(\w+)(?:\s+(.*))?/);
        if (!match) return { success: false, message: "No command pattern found.", error: "Invalid syntax" };

        const [, command, argString] = match;
        const commandName = this.aliases[command.toLowerCase()] || command.toLowerCase();
        const args = argString ? argString.split(/\s+/) : [];

        if (!this.commands[commandName]) {
            return { success: false, message: `Command '${commandName}' not recognized.`, error: "Command not found" };
        }

        return { success: true, commandName, args };
    }

    async executeCommand(commandName, args) {
        const command = this.commands[commandName];
        if (!command) {
            return { success: false, message: "Command not available.", error: "Command implementation missing" };
        }

        return command.execute(args);
    }
}

module.exports = CommandManager;
