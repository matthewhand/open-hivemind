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
exports.executeServerCommand = executeServerCommand;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:serverCommand');
/**
 * Execute Server Command
 *
 * Handles the execution of server-related commands received through Discord messages.
 * Provides detailed logging for each step, including the receipt of the command, execution logic,
 * and any errors encountered during the process.
 *
 * @param message - The message that triggered the command.
 * @param args - The arguments passed with the command.
 */
function executeServerCommand(message, args) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('executeServerCommand: Received command with message ID ' + message.getMessageId() + ' and args: ' + args.join('  '));
        try {
            debug('executeServerCommand: Executing server command logic');
            // Execute server command logic
            debug('executeServerCommand: Successfully executed server command with args: ' + args.join('  '));
        }
        catch (error) {
            debug('Error executing server command: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });
}
