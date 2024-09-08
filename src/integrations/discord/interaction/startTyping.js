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
exports.startTyping = startTyping;
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const debug = (0, debug_1.default)('app:startTyping');
/**
 * Start Typing Indicator
 *
 * This function triggers the typing indicator in a specified Discord text or news channel.
 * It fetches the channel by its ID and starts the typing indicator if the channel supports it.
 *
 * Key Features:
 * - Fetches the channel by ID using the Discord client.
 * - Verifies if the channel supports typing indicators.
 * - Logs detailed information for debugging purposes.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel where the typing indicator should be started.
 * @returns {Promise<void>} A promise that resolves when the typing indicator is started.
 */
function startTyping(client, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            debug('Fetching channel ID: ' + channelId);
            const channel = yield client.channels.fetch(channelId);
            debug('Fetched channel: ' + (channel ? channel.id : 'null'));
            if (!channel) {
                debug('Channel with ID: ' + channelId + ' not found.');
                return;
            }
            debug('Channel type: ' + channel.type);
            if (channel instanceof discord_js_1.TextChannel || channel instanceof discord_js_1.NewsChannel) {
                yield channel.sendTyping();
                debug('Started typing in channel ID: ' + channelId);
            }
            else {
                debug('Channel ID: ' + channelId + ' does not support typing.');
            }
        }
        catch (error) {
            debug('Failed to start typing in channel ID: ' + channelId + ': ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}
