"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFollowUp = sendFollowUp;
const debug_1 = __importDefault(require("debug"));
const sendMessageToChannel_1 = require("./sendMessageToChannel");
const debug = (0, debug_1.default)('app:interaction:sendFollowUp');
/**
 * Sends a follow-up message to the specified channel.
 * This function is triggered after the initial response has been sent,
 * and is used to keep the conversation active or provide additional information.
 *
 * @param {Client} client - The Discord client instance.
 * @param {IMessage} message - The original message that triggered the follow-up.
 * @param {string} channelId - The ID of the channel to send the follow-up message to.
 * @param {string} topic - The topic of the follow-up message.
 * @returns {Promise<void>} - The function returns a promise that resolves when the follow-up is sent.
 */
async function sendFollowUp(client, message, channelId, topic) {
    const followUpContent = 'Continuing the discussion on: ' + topic;
    debug('Sending follow-up message to channel ID: ' + channelId + '. Topic: ' + topic);
    await (0, sendMessageToChannel_1.sendMessageToChannel)(client, channelId, followUpContent);
}
