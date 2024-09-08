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
exports.IMessage = void 0;
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:IMessage');
/**
 * Abstract class representing a standardized message format.
 * This class is intended to be extended with specific implementations as needed.
 */
class IMessage {
    constructor(data, role) {
        this.content = ""; // Added content property
        this.channelId = ""; // Added channelId property
        if (new.target === IMessage) {
            throw new TypeError('Cannot construct IMessage instances directly');
        }
        this.data = data;
        this.role = role;
        debug('IMessage initialized with data: ' + JSON.stringify(data));
    }
    /**
     * Checks if the message is a reply to the bot.
     * @returns {boolean} True if the message is a reply to the bot, false otherwise.
     */
    isReplyToBot() {
        return false;
    }
    /**
     * Sends a reply to the message.
     * @param {string} content - The content of the reply.
     * @returns {Promise<void>} A promise that resolves when the reply is sent.
     */
    reply(content) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Replying with content: ' + content);
            // Implementation logic for replying to a message
        });
    }
}
exports.IMessage = IMessage;
