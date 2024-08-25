import Debug from "debug";
const debug = Debug("app");

import { aliases } from '@command/aliases';
/**
 * Returns a random command prefixed with '!'.
 * 
 * @returns A random alias command.
 */
export function getRandomAliasCommand(): string {
    const aliasKeys = Object.keys(aliases);
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
export function getAliasDescription(commandName: string): string {
    const alias = aliases[commandName.toLowerCase()];
    const description = alias ? alias.description : 'No description available.';
    debug('Fetched alias description for command: ' + commandName + '  description: ' + description);
    return description;
}
/**
 * Lists all aliases with their descriptions, formatted as a string.
 * 
 * @returns A formatted list of all aliases and their descriptions.
 */
export function listAllAliases(): string {
    const allAliases = Object.entries(aliases)
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
export function findAliasesByCategory(category: string): Record<string, string> {
    const categorizedAliases = Object.entries(aliases)
        .filter(([, alias]) => alias.category === category)
        .reduce((acc, [command, { description }]) => {
            acc[command] = description;
            return acc;
        }, {} as Record<string, string>);
    debug('Found aliases by category: ' + category);
    return categorizedAliases;
}
/**
 * Gets detailed info for an alias, optionally formatted for display.
 * 
 * @param commandName - The name of the command.
 * @returns The detailed information of the alias or a default message if not found.
 */
export function getDetailedAliasInfo(commandName: string): string {
    const alias = aliases[commandName.toLowerCase()];
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
