// src/utils/commandUtils.js

const { aliases } = require('../config/aliases');
const commands = require('../commands/inline'); // Assuming this is where direct commands are defined

// Check if commandName is a direct command or an alias
function isDirectOrAliasCommand(commandName) {
    return Object.keys(commands).includes(commandName) || Object.keys(aliases).includes(commandName);
}

function isValidCommand(messageContent, botId) {
    const commandPrefix = '!';
    const botMentionRegex = new RegExp(`^<@!?${botId}>\\s*`);
    const contentWithoutMention = messageContent.replace(botMentionRegex, '').trim();

    if (!contentWithoutMention.startsWith(commandPrefix)) {
        return false;
    }

    const commandName = contentWithoutMention.split(/\s+/)[0].slice(commandPrefix.length).toLowerCase();

    return isDirectOrAliasCommand(commandName);
}

module.exports = { isValidCommand };
