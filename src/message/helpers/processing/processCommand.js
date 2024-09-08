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
exports.processCommand = processCommand;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:processCommand');
/**
 * Process Command
 *
 * This function processes a command extracted from a given message. It identifies and executes the command, then passes the result
 * to a callback function for further handling. The function also includes logging for each step of the process.
 *
 * Key Features:
 * - Extracts and identifies commands from a given message.
 * - Simulates command execution and provides the result via a callback.
 * - Logs detailed information about the command processing steps, including errors.
 *
 * @param {IMessage} message - The original message object containing the command.
 * @param {(result: string) => Promise<void>} callback - A callback function to handle the command result.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
function processCommand(message, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const text = message.getText().trim();
            if (!text.startsWith('!')) {
                debug('[processCommand] No command found in message: ' + text);
                return;
            }
            const command = text.slice(1).split(' ')[0];
            debug('[processCommand] Command extracted: ' + command);
            // Simulated command processing logic (e.g., checking against a command list)
            const commandResult = `Executed command: ${command}`;
            yield callback(commandResult);
        }
        catch (error) {
            debug('[processCommand] Error processing command: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
