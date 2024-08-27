/**
 * @file reconstructCommandFromAlias.ts
 * @description This utility module provides functions to resolve, reconstruct, and describe commands based on aliases.
 * 
 * The module is used primarily for processing user-input commands that may be provided in shorthand (aliases).
 * It allows the bot to interpret these aliases by mapping them to their full command equivalents, reconstructing 
 * the full command string, and providing descriptions or lists of available aliases.
 * 
 * Key Functions:
 * - `resolveAlias`: Resolves a given alias to its corresponding command.
 * - `reconstructCommand`: Reconstructs a full command string using the resolved alias and provided arguments.
 * - `getAliasDescription`: Retrieves a description for a specific alias.
 * - `listAliases`: Lists all available aliases.
 * 
 * Debug logging is utilized to provide insights into the alias resolution and command reconstruction process.
 * 
 * Note: This file is currently under review for potential consolidation with a similar module in `src/utils/`.
 * If redundancy is found, the files may be merged or one of them deprecated.
 * 
 * @module reconstructCommandFromAlias
 * @category Utilities
 * @see {@link src/utils/reconstructCommandFromAlias.ts}
 */

import Debug from "debug";

const debug = Debug('app:reconstructCommandFromAlias');

// Type definitions for alias mapping
export interface Alias {
    command: string;
    description: string;
}

export type AliasMapping = Record<string, Alias>;

// Function implementations
export function resolveAlias(alias: string, aliases: AliasMapping): string {
    const resolvedCommand = aliases[alias]?.command || alias;
    debug(`resolveAlias: Resolved alias '${alias}' to command '${resolvedCommand}'`);
    return resolvedCommand;
}

export function reconstructCommand(alias: string, args: string[], aliases: AliasMapping): string {
    const resolvedCommand = resolveAlias(alias, aliases);
    const reconstructedCommand = `${resolvedCommand} ${args.join(' ')}`;
    debug(`reconstructCommand: Reconstructed command - '${reconstructedCommand}'`);
    return reconstructedCommand;
}

export function getAliasDescription(alias: string, aliases: AliasMapping): string {
    const description = aliases[alias]?.description || 'No description available';
    debug(`getAliasDescription: Description for alias '${alias}' is '${description}'`);
    return description;
}

export function listAliases(aliases: AliasMapping): string[] {
    const aliasList = Object.keys(aliases);
    debug(`listAliases: Available aliases - ${aliasList.join(', ')}`);
    return aliasList;
}
