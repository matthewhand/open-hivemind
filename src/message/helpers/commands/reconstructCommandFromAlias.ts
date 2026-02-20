/**
 * @file reconstructCommandFromAlias.ts
 * @description This utility module provides functions to resolve, reconstruct, and describe commands based on aliases.
 *
 * The module is used primarily for processing user-input commands that may be provided in shorthand (aliases).
 * It allows the bot to interpret these aliases by mapping them to their full command equivalents, reconstructing
 * the full command string, and providing descriptions or lists of available aliases.
 *
 * Key Functions:
 * - {@link resolveAlias}: Resolves a given alias to its corresponding command.
 * - {@link reconstructCommand}: Reconstructs a full command string using the resolved alias and provided arguments.
 * - {@link getAliasDescription}: Retrieves a description for a specific alias.
 * - {@link listAliases}: Lists all available aliases.
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

import Debug from 'debug';

const debug = Debug('app:reconstructCommandFromAlias');

/**
 * Represents an alias configuration for a command.
 * @interface Alias
 */
export interface Alias {
    /** The full command string that this alias maps to */
    command: string;
    /** A human-readable description of what this alias does */
    description: string;
}

/**
 * A mapping of alias names to their corresponding {@link Alias} configurations.
 * @typedef {Record<string, Alias>} AliasMapping
 */
export type AliasMapping = Record<string, Alias>;

/**
 * Resolves an alias to its corresponding command string.
 *
 * @param {string} alias - The alias to resolve. Can be the alias name or the actual command.
 * @param {AliasMapping} aliases - The mapping of aliases to their command configurations.
 * @returns {string} The resolved command string. If the alias is not found in the mapping, returns the original alias.
 *
 * @example
 * ```typescript
 * const aliases = {
 *   'help': { command: 'show help', description: 'Display help information' },
 *   'h': { command: 'show help', description: 'Display help information' }
 * };
 *
 * resolveAlias('help', aliases); // Returns: 'show help'
 * resolveAlias('unknown', aliases); // Returns: 'unknown'
 * ```
 *
 * @since 1.0.0
 */
export function resolveAlias(alias: string, aliases: AliasMapping): string {
  const resolvedCommand = aliases[alias]?.command || alias;
  debug(`resolveAlias: Resolved alias '${alias}' to command '${resolvedCommand}'`);
  return resolvedCommand;
}

/**
 * Reconstructs a complete command string from an alias and arguments.
 *
 * @param {string} alias - The alias or command name to reconstruct.
 * @param {string[]} args - Array of arguments to append to the resolved command.
 * @param {AliasMapping} aliases - The mapping of aliases to their command configurations.
 * @returns {string} The complete reconstructed command string with arguments.
 *
 * @example
 * ```typescript
 * const aliases = {
 *   'greet': { command: 'send greeting', description: 'Send a greeting message' }
 * };
 *
 * reconstructCommand('greet', ['hello', 'world'], aliases);
 * // Returns: 'send greeting hello world'
 *
 * reconstructCommand('unknown', ['arg1', 'arg2'], aliases);
 * // Returns: 'unknown arg1 arg2'
 * ```
 *
 * @since 1.0.0
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
 * @param {string} alias - The alias to get the description for.
 * @param {AliasMapping} aliases - The mapping of aliases to their command configurations.
 * @returns {string} The description of the alias, or 'No description available' if the alias is not found.
 *
 * @example
 * ```typescript
 * const aliases = {
 *   'help': { command: 'show help', description: 'Display help information' }
 * };
 *
 * getAliasDescription('help', aliases); // Returns: 'Display help information'
 * getAliasDescription('unknown', aliases); // Returns: 'No description available'
 * ```
 *
 * @since 1.0.0
 */
export function getAliasDescription(alias: string, aliases: AliasMapping): string {
  const description = aliases[alias]?.description || 'No description available';
  debug(`getAliasDescription: Description for alias '${alias}' is '${description}'`);
  return description;
}

/**
 * Lists all available aliases in the provided mapping.
 *
 * @param {AliasMapping} aliases - The mapping of aliases to their command configurations.
 * @returns {string[]} An array of all alias names (keys) in the mapping.
 *
 * @example
 * ```typescript
 * const aliases = {
 *   'help': { command: 'show help', description: 'Display help information' },
 *   'h': { command: 'show help', description: 'Display help information' }
 * };
 *
 * listAliases(aliases); // Returns: ['help', 'h']
 *
 * listAliases({}); // Returns: []
 * ```
 *
 * @since 1.0.0
 */
export function listAliases(aliases: AliasMapping): string[] {
  const aliasList = Object.keys(aliases);
  debug(`listAliases: Available aliases - ${aliasList.join(', ')}`);
  return aliasList;
}
