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
exports.sendMessageToChannel = sendMessageToChannel;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:sendMessageToChannel');
/**
 * Send Message to Channel
 *
 * This function handles sending a message to a specified Discord text channel. It manages the sending process, handles any
 * errors that may occur, and logs the actions for easier debugging.
 *
 * Key Features:
 * - Sends a message to the specified Discord text channel.
 * - Handles potential errors during the message sending process.
 * - Logs the success or failure of the message sending operation.
 *
 * @param {TextChannel} channel - The channel to send the message to.
 * @param {string} content - The content of the message to send.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
function sendMessageToChannel(channel, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield channel.send(content);
            debug('Message sent to channel ' + channel.id);
        }
        catch (error) {
            debug('Error sending message to channel: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
