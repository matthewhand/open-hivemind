"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = void 0;
const debug_1 = __importDefault(require("debug"));
const DiscordMessage_1 = __importDefault(require("@src/integrations/discord/DiscordMessage"));
const log = (0, debug_1.default)('app:handleMessage');
/**
 * Handles incoming Discord messages, converting them to IMessage and
 * invoking the provided handler function.
 *
 * @param message - The incoming Discord message.
 * @param messageHandler - The handler function to process the IMessage.
 */
const handleMessage = (message, messageHandler) => {
    log(`Received a message with ID: ${message.id}`);
    const iMessage = new DiscordMessage_1.default(message);
    messageHandler(iMessage);
};
exports.handleMessage = handleMessage;
