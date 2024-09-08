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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponse = sendResponse;
/**
 * Sends a response message to a specified channel.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param message - The message content to send.
 * @returns A promise resolving when the message is sent.
 */
function sendResponse(client, channelId, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = yield client.channels.fetch(channelId);
            if (channel && channel.send) {
                yield channel.send(message);
            }
            else {
                throw new Error('Unable to find channel or send message');
            }
        }
        catch (error) {
            console.error('[sendResponse] Error sending response:', error);
            throw error;
        }
    });
}
