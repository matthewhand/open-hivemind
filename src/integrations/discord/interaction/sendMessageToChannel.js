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
 * Sends a message to a specific Discord channel.
 *
 * This function retrieves the channel by its ID, sends the specified message content to the channel, and logs the process.
 * It includes error handling to log and manage any issues that occur during message sending.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param messageContent - The content of the message to be sent.
 * @returns {Promise<Message | void>} The sent message object or void if an error occurs.
 */
function sendMessageToChannel(client, channelId, messageContent) {
    return __awaiter(this, void 0, void 0, function* () {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            debug('Channel with ID ' + channelId + ' not found.');
            return;
        }
        try {
            const sentMessage = yield channel.send(messageContent);
            debug('Message sent to channel ID ' + channelId + ': ' + messageContent);
            return sentMessage;
        }
        catch (error) {
            debug('Error sending message to channel ID ' + channelId + ': ' + error.message);
        }
    });
}
