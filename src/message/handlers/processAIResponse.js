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
exports.processAIResponse = processAIResponse;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:processAIResponse');
/**
 * Processes an AI response to a given result and replies to the original message.
 *
 * This function handles the processing of an AI-generated response based on the result of a command
 * or action, and replies to the original message with the AI response.
 *
 * @param {string} result - The result of the command or action.
 * @param {Message<boolean>} message - The original message object.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
function processAIResponse(result, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            debug('Processing AI response for result: ' + result);
            // Simulated AI response logic based on the result
            const aiResponse = `AI Response for: ${result}`;
            yield message.reply(aiResponse);
        }
        catch (error) {
            debug('Error processing AI response: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
