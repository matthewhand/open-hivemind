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
exports.connectToVoiceChannel = connectToVoiceChannel;
const debug_1 = __importDefault(require("debug"));
const discord_js_1 = require("discord.js");
const getRandomDelay_1 = require("@src/common/getRandomDelay");
const debug = (0, debug_1.default)('app:connectToVoiceChannel');
/**
 * Connect to Voice Channel
 *
 * This function handles the connection of the bot to a specified Discord voice channel. It includes logic to simulate a
 * connection delay and handles any errors that may occur during the connection process.
 *
 * Key Features:
 * - Fetches and validates the specified voice channel using the provided channel ID.
 * - Simulates a delay before establishing the connection to the voice channel.
 * - Logs key actions and errors for easier debugging and maintenance.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the voice channel to connect to.
 * @returns A promise that resolves to the connected voice channel instance.
 */
function connectToVoiceChannel(client, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = yield client.channels.fetch(channelId);
            if (!channel || !(channel instanceof discord_js_1.VoiceChannel)) {
                debug('Failed to fetch or invalid channel for ID: ' + channelId);
                throw new Error('Invalid voice channel ID');
            }
            debug('Connecting to voice channel: ' + channel.name);
            const delay = (0, getRandomDelay_1.getRandomDelay)(1000, 5000);
            debug('Simulating connection delay of ' + delay + 'ms');
            yield new Promise(resolve => setTimeout(resolve, delay));
            return channel;
        }
        catch (error) {
            debug('Error connecting to voice channel: ' + (error instanceof Error ? error.message : String(error)));
            throw error;
        }
    });
}
