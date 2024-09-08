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
const debug = (0, debug_1.default)('app:commandHandler');
/**
 * Executes a command based on the parsed command details.
 * @param commandDetails - Parsed details of the command.
 * @param commands - Available commands to execute.
 * @param aliases - Mapping of command aliases.
 * @returns The result of the command execution.
 */
function executeParsedCommand(commandDetails, commands, aliases) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!commandDetails) {
            debug('executeParsedCommand: No command details provided');
            return { success: false, message: 'Invalid command syntax.', error: 'No command details provided.' };
        }
        const { command, args } = commandDetails;
        const commandName = aliases[command] || command;
        const commandInstance = commands[commandName];
        if (!commandInstance) {
            debug('executeParsedCommand: Command not found - ' + commandName);
            return { success: false, message: 'Command not found.', error: 'Command implementation missing.' };
        }
        try {
            const result = yield commandInstance.execute(args);
            debug('executeParsedCommand: Command executed - ' + commandName);
            return { success: true, result };
        }
        catch (error) {
            debug('executeParsedCommand: Error executing command - ' + commandName + ': ' + error.message);
            return { success: false, message: 'Error executing command.', error: error.message };
        }
    });
}
