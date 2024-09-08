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
exports.sendMessageToChannel = void 0;
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('app:sendMessageToChannel');
/**
 * Sends a message to a specified Discord channel.
 *
 * @param channel - The TextChannel where the message should be sent.
 * @param message - The content of the message to be sent.
 */
const sendMessageToChannel = (channel, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        log(`Sending message to channel ${channel.id}: ${message}`);
        yield channel.send(message);
        log(`Message sent to channel ${channel.id} successfully`);
    }
    catch (error) {
        log(`Failed to send message to channel ${channel.id}: ` + error.message);
        throw error;
    }
});
exports.sendMessageToChannel = sendMessageToChannel;
