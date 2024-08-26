import Debug from "debug";

export interface Alias {
    command: string;
    description: string;
}

export type AliasMapping = Record<string, Alias>;

/**
 * Resolves a command from an alias.
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
 * @param aliases - The alias mapping object.
 * @returns An array of alias names.
 */
export function listAliases(aliases: AliasMapping): string[] {
    const aliasList = Object.keys(aliases);
    debug(`listAliases: Available aliases - ${aliasList.join(', ')}`);
    return aliasList;
}

