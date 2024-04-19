const { parseCommand } = require('../utils/commandParser');
const { aliases } = require('../config/aliases');
const commands = require('../commands/inline');
const logger = require('../utils/logger');
const IMessage = require('../interfaces/IMessage');  // Ensure IMessage is correctly imported

/**
 * Processes commands parsed from messages that conform to the IMessage interface.
 * Validates the command structure, checks for aliases, and executes the command if valid.
 *
 * @param {IMessage} message - The message object implementing the IMessage interface.
 * @returns {Promise<void>} - A promise that resolves when the command has been processed.
 */
async function processCommand(message) {
    try {
        // Validate that the message is an instance of IMessage
        if (!(message instanceof IMessage)) {
            throw new TypeError("Provided message does not implement IMessage interface");
        }

        // Extract and trim command content from the message
        const commandContent = message.getText().trim();
        
        // Resolve command from the content
        const resolvedCommand = parseCommand(commandContent);
        if (!resolvedCommand) {
            message.reply('No command found in the message.');
            return;
        }

        // Destructure resolved command and validate existence of required fields
        const { commandName, action, args } = resolvedCommand;
        if (typeof commandName !== 'string' || typeof action !== 'string' || typeof args !== 'string') {
            throw new TypeError("Resolved command is missing required properties (commandName, action, args must be strings).");
        }

        // Resolve command alias and retrieve the command object
        const resolvedAlias = aliases[commandName] || commandName;
        const command = commands[resolvedAlias];

        if (command) {
            logger.info(`Executing command: ${commandName}, Action: ${action}, Args: ${args}`);
            await command.execute(message, args, action);  // Execute the command function
        } else {
            logger.warn(`Unknown command: ${commandName}`);
            message.reply(`Unknown command: '${commandName}'. Try '!help' for a list of commands.`);
        }
    } catch (error) {
        logger.error(`Error while handling command: ${message.getText()}`, error);
        message.reply('An error occurred while processing your command.');
    }
}

module.exports = { processCommand };  // Exporting as an object with processCommand method
