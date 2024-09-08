"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomAliasCommand = getRandomAliasCommand;
exports.getAliasDescription = getAliasDescription;
exports.listAllAliases = listAllAliases;
exports.findAliasesByCategory = findAliasesByCategory;
exports.getDetailedAliasInfo = getDetailedAliasInfo;
const debug_1 = __importDefault(require("debug"));
const aliases_1 = require("@command/aliases");
const debug = (0, debug_1.default)('app:aliasUtils');
/**
 * Utility functions for managing and resolving command aliases.
 *
 * This module provides functions to handle command aliases within the application.
 * It allows for the resolution of commands based on user-defined aliases, enabling more flexible interactions.
 *
 * Key Features:
 * - Resolves commands based on a predefined alias map.
 * - Logs important steps in the alias resolution process for debugging.
 * - Handles scenarios where no aliases are available.
 */
/**
 * Returns a random command prefixed with '!'.
 *
 * @returns A random alias command.
 */
function getRandomAliasCommand() {
    const aliasKeys = Object.keys(aliases_1.aliases);
    if (aliasKeys.length === 0) {
        debug('No aliases available.');
        return '';
    }
    const randomIndex = Math.floor(Math.random() * aliasKeys.length);
    const randomCommand = '!' + aliasKeys[randomIndex];
    debug('Generated random alias command: ' + randomCommand);
    return randomCommand;
}
/**
 * Fetches the description for a given alias.
 *
 * @param commandName - The name of the command.
 * @returns The description of the alias or a default message if not found.
 */
function getAliasDescription(commandName) {
    const alias = aliases_1.aliases[commandName.toLowerCase()];
    const description = alias ? alias.description : 'No description available.';
    debug('Fetched alias description for command: ' + commandName + '  description: ' + description);
    return description;
}
/**
 * Lists all aliases with their descriptions, formatted as a string.
 *
 * @returns A formatted list of all aliases and their descriptions.
 */
function listAllAliases() {
    const allAliases = Object.entries(aliases_1.aliases)
        .map(([command, { description }]) => '!' + command + ' - ' + description)
        .join('\n');
    debug('Listing all aliases');
    return allAliases;
}
/**
 * Finds aliases by category (if your aliases are categorized).
 *
 * @param category - The category to filter by.
 * @returns The aliases that match the given category.
 */
function findAliasesByCategory(category) {
    const categorizedAliases = Object.entries(aliases_1.aliases)
        .filter(([, alias]) => alias.category === category)
        .reduce((acc, [command, { description }]) => {
        acc[command] = description;
        return acc;
    }, {});
    debug('Found aliases by category: ' + category);
    return categorizedAliases;
}
/**
 * Gets detailed info for an alias, optionally formatted for display.
 *
 * @param commandName - The name of the command.
 * @returns The detailed information of the alias or a default message if not found.
 */
function getDetailedAliasInfo(commandName) {
    const alias = aliases_1.aliases[commandName.toLowerCase()];
    if (!alias) {
        const message = 'Alias does not exist.';
        debug(message);
        return message;
    }
    const { handler, description } = alias;
    const detailedInfo = 'CommandHandler: !' + commandName + '\nHandler: ' + handler + '\nDescription: ' + description;
    debug('Fetched detailed info for command: ' + commandName + '  info: ' + detailedInfo);
    return detailedInfo;
}
