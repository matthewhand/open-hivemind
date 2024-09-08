"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAlias = resolveAlias;
exports.reconstructCommand = reconstructCommand;
exports.getAliasDescription = getAliasDescription;
exports.listAliases = listAliases;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:reconstructCommandFromAlias');
// Function implementations
function resolveAlias(alias, aliases) {
    var _a;
    const resolvedCommand = ((_a = aliases[alias]) === null || _a === void 0 ? void 0 : _a.command) || alias;
    debug(`resolveAlias: Resolved alias '${alias}' to command '${resolvedCommand}'`);
    return resolvedCommand;
}
function reconstructCommand(alias, args, aliases) {
    const resolvedCommand = resolveAlias(alias, aliases);
    const reconstructedCommand = `${resolvedCommand} ${args.join(' ')}`;
    debug(`reconstructCommand: Reconstructed command - '${reconstructedCommand}'`);
    return reconstructedCommand;
}
function getAliasDescription(alias, aliases) {
    var _a;
    const description = ((_a = aliases[alias]) === null || _a === void 0 ? void 0 : _a.description) || 'No description available';
    debug(`getAliasDescription: Description for alias '${alias}' is '${description}'`);
    return description;
}
function listAliases(aliases) {
    const aliasList = Object.keys(aliases);
    debug(`listAliases: Available aliases - ${aliasList.join(', ')}`);
    return aliasList;
}
