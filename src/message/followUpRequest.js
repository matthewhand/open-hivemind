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
exports.followUpRequest = followUpRequest;
const sendFollowUpRequest_1 = require("@src/message/helpers/followUp/sendFollowUpRequest");
/**
 * Handles the follow-up request by sending a follow-up message.
 *
 * @param message - The original message.
 * @param channelId - The ID of the channel to send the follow-up to.
 * @param topic - The topic of the follow-up message.
 */
function followUpRequest(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const channelId = message.getChannelId();
        const topic = message.getChannelTopic() || 'General Discussion';
        try {
            yield (0, sendFollowUpRequest_1.sendFollowUpRequest)(message, channelId, topic);
        }
        catch (error) {
            console.error('[followUpRequest] Error sending follow-up request:', error);
        }
    });
}
