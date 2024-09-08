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
exports.sendFollowUp = sendFollowUp;
/**
 * Sends a follow-up message to a specific channel.
 *
 * @param message - The original message triggering the follow-up.
 * @param channelId - The ID of the channel to send the follow-up to.
 * @param topic - The topic of the follow-up message.
 */
function sendFollowUp(message, channelId, topic) {
    return __awaiter(this, void 0, void 0, function* () {
        const channel = yield message.client.channels.fetch(channelId);
        if (channel && channel.send) {
            yield channel.send(`Follow-up on ${topic}: ${message.getText()}`);
        }
        else {
            throw new Error('Unable to find channel or send message');
        }
    });
}
