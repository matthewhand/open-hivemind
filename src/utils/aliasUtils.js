const { aliases } = require('../config/aliases');
const logger = require('./logger');

/**
 * Returns a random command prefixed with '!'.
 * @returns {string} A random alias command.
 */
function getRandomAliasCommand() {
    const aliasKeys = Object.keys(aliases);
    const randomIndex = Math.floor(Math.random() * aliasKeys.length);
    const randomCommand = '!'+aliasKeys[randomIndex];
    logger.debug('Generated random alias command: ' + randomCommand);
    return randomCommand;
}

/**
 * Fetches the description for a given alias.
 * @param {string} commandName - The name of the command.
 * @returns {string} The description of the alias or a default message if not found.
 */
function getAliasDescription(commandName) {
    const alias = aliases[commandName.toLowerCase()];
    const description = alias ? alias.description : 'No description available.';
    logger.debug('Fetched alias description for command: ' + commandName + ', description: ' + description);
    return description;
}

/**
 * Lists all aliases with their descriptions, formatted as a string.
 * @returns {string} A formatted list of all aliases and their descriptions.
 */
function listAllAliases() {
    const allAliases = Object.entries(aliases).map(([command, { description }]) =>
        '!'+command + ' - ' + description).join('\n');
    logger.debug('Listing all aliases');
    return allAliases;
}

/**
 * Finds aliases by category (if your aliases are categorized).
 * @param {string} category - The category to filter by.
 * @returns {Object} The aliases that match the given category.
 */
function findAliasesByCategory(category) {
    const categorizedAliases = Object.entries(aliases)
        .filter(([_, alias]) => alias.category === category)
        .reduce((acc, [command, { description }]) => {
            acc[command] = description;
            return acc;
        }, {});
    logger.debug('Found aliases by category: ' + category);
    return categorizedAliases;
}

/**
 * Gets detailed info for an alias, optionally formatted for display.
 * @param {string} commandName - The name of the command.
 * @returns {string} The detailed information of the alias or a default message if not found.
 */
function getDetailedAliasInfo(commandName) {
    const alias = aliases[commandName.toLowerCase()];
    if (!alias) {
        const message = 'Alias does not exist.';
        logger.debug(message);
        return message;
    }
    const { handler, description } = alias;
    const detailedInfo = 'Command: !'+commandName+'\nHandler: ' + handler + '\nDescription: ' + description;
    logger.debug('Fetched detailed info for command: ' + commandName + ', info: ' + detailedInfo);
    return detailedInfo;
}

module.exports = {
    getRandomAliasCommand,
    getAliasDescription,
    listAllAliases,
    findAliasesByCategory,
    getDetailedAliasInfo
};
