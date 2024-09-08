"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeParsedCommand = executeParsedCommand;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:command:executeParsedCommand');
/**
 * Executes a command using the provided command details, command repository, and aliases.
 * This function handles the execution flow, including command validation, alias resolution,
 * and error handling.
 *
 * @param {CommandDetails | null} commandDetails - The command and its arguments to be executed.
 * @param {CommandRepository} commands - A repository of available command instances.
 * @param {AliasMapping} aliases - A mapping of command aliases to their respective command names.
 * @returns {Promise<{ success: boolean; message?: string; error?: string; result?: any }>} - The result of the command execution, including success status, message, and any error or result data.
 */
function executeParsedCommand(commandDetails, commands, aliases) {
    return __awaiter(this, void 0, void 0, function* () {
        // Guard clause: Ensure command details are provided
        if (!commandDetails) {
            const errorMessage = 'executeParsedCommand: No command details provided.';
            console.error(errorMessage);
            return { success: false, message: 'Invalid command syntax.', error: errorMessage };
        }
        const { command, args } = commandDetails;
        const commandName = aliases[command] || command;
        debug(`executeParsedCommand: Resolving command '${command}' to '${commandName}' with args: ${args}`);
        const commandInstance = commands[commandName];
        if (!commandInstance) {
            const errorMessage = `executeParsedCommand: Command handler not found for '${commandName}'.`;
            console.error(errorMessage);
            return { success: false, message: 'Command handler not available.', error: errorMessage };
        }
        try {
            const result = yield commandInstance.execute(args);
            debug(`executeParsedCommand: Command '${commandName}' executed successfully. Result: ${result}`);
            return { success: true, result };
        }
        catch (error) {
            const errorMessage = `executeParsedCommand: Error executing command '${commandName}'. Error: ${error.message}`;
            console.error(errorMessage);
            debug(`executeParsedCommand: Error stack trace: ${error.stack}`);
            return { success: false, message: 'Error executing command.', error: errorMessage };
        }
    });
}
