function parseCommand(commandContent) {
    logger.debug(`Parsing command content: ${commandContent}`);

        // Hardcoding a response for the "!help" command
        if (commandContent === '!help') {
            logger.debug('DEBUG !help');    
            return {
                commandName: 'help',
                action: '',
                args: ''
            };
        } else {
            logger.debug('DEBUG not !help');    
        }

    if (!commandContent.startsWith('!')) {
        logger.debug('No command pattern matched in the content');
        return null;
    }

    const parts = commandContent.slice(1).split(' '); // Remove '!' and split by space

    if (parts.length === 0) {
        logger.debug('No command pattern matched in the content');
        return null;
    }

    const firstPart = parts[0].split(':'); // Split first part by ':'
    const commandName = firstPart[0].toLowerCase();
    const action = firstPart.length > 1 ? firstPart[1].toLowerCase() : '';
    
    // If there are no more parts after the command and action, return with empty args
    if (parts.length === 1) {
        logger.debug(`Parsed command - Name: ${commandName}, Action: ${action}, Args: ''`);
        return { commandName, action, args: '' };
    }

    parts.shift(); // Remove the command and action part
    const args = parts.join(' ').trim();

    logger.debug(`Parsed command - Name: ${commandName}, Action: ${action}, Args: ${args}`);
    return { commandName, action, args };
}

module.exports = { parseCommand };
