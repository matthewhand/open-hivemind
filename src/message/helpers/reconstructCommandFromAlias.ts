import Debug from "debug";

const debug = Debug('app:reconstructCommandFromAlias');

export interface Alias {
    command: string;
    description: string;
}

export type AliasMapping = Record<string, Alias>;

/**
 * Resolves a command from an alias.
 *
 * This function takes an alias provided by the user and looks it up in the alias mapping object.
 * If the alias is found, it returns the corresponding command; otherwise, it returns the alias itself.
 *
 * @param alias - The alias provided by the user.
 * @param aliases - The alias mapping object.
 * @returns The resolved command string.
 */
export function resolveAlias(alias: string, aliases: AliasMapping): string {
    const resolvedCommand = aliases[alias]?.command || alias;
    debug(`resolveAlias: Resolved alias '${alias}' to command '${resolvedCommand}'`);
    return resolvedCommand;
}

/**
 * Reconstructs a full command string from an alias and its arguments.
 *
 * This function takes an alias and its arguments, resolves the alias to the full command, and
 * reconstructs the full command string to be executed.
 *
 * @param alias - The alias provided by the user.
 * @param args - The arguments passed with the alias.
 * @param aliases - The alias mapping object.
 * @returns The reconstructed command string.
 */
export function reconstructCommand(alias: string, args: string[], aliases: AliasMapping): string {
    const resolvedCommand = resolveAlias(alias, aliases);
    const reconstructedCommand = `${resolvedCommand} ${args.join(' ')}`;
    debug(`reconstructCommand: Reconstructed command - '${reconstructedCommand}'`);
    return reconstructedCommand;
}

/**
 * Retrieves the description for a given alias.
 *
 * This function looks up the provided alias in the alias mapping object and returns its description.
 * If the alias is not found, it returns a default message indicating that no description is available.
 *
 * @param alias - The alias to look up.
 * @param aliases - The alias mapping object.
 * @returns The description of the alias.
 */
export function getAliasDescription(alias: string, aliases: AliasMapping): string {
    const description = aliases[alias]?.description || 'No description available';
    debug(`getAliasDescription: Description for alias '${alias}' is '${description}'`);
    return description;
}

/**
 * Lists all available aliases.
 *
 * This function returns an array of all the alias names defined in the alias mapping object.
 *
 * @param aliases - The alias mapping object.
 * @returns An array of alias names.
 */
export function listAliases(aliases: AliasMapping): string[] {
    const aliasList = Object.keys(aliases);
    debug(`listAliases: Available aliases - ${aliasList.join(', ')}`);
    return aliasList;
}
