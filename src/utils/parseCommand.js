function parseCommand(messageContent) {
    const commandRegex = /(?:@bot\s+)?^!(\w+)(?::(\w+))?\s*(.*)/;
    const matches = messageContent.match(commandRegex);
    if (!matches) return null;

    const [_, command, action, args] = matches;
    return { command: command.toLowerCase(), action, args };
}

module.exports = { parseCommand };
