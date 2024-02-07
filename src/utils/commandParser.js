const logger = require('./logger');
const config = require('./config'); // Assuming this is where you'd store/retrieve your global defaultCommand

function parseCommand(commandContent) {
    logger.debug(`Parsing command content: ${commandContent}`);

    // Define the command pattern
    const commandRegex = /^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const commandName = matches[1].toLowerCase();
        const action = matches[2] || '';
        const args = matches[3].trim();

        logger.debug(`Parsed command - Name: ${commandName}, Action: ${action}, Args: ${args}`);
        return { commandName, action, args };
    } else {
        // If no command pattern matched and a default command is defined
        const defaultCommand = config.defaultCommand || 'oai'; 
        if (defaultCommand) {
            logger.debug(`No command pattern matched, using default command: ${defaultCommand}`);
            // Return the default command with the entire message content as args
            // This allows for custom handling where the default command can decide how to interpret the args
            return { commandName: defaultCommand, action: '', args: commandContent };
        }
    }

    logger.debug('No command pattern matched in the content, and no default command defined');
    return null;
}

module.exports = { parseCommand };
