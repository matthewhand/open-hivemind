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
exports.fetchChannel = fetchChannel;
const discord_js_1 = require("discord.js");
/**
 * Fetch Channel
 *
 * This function fetches a channel by its ID using the provided Discord client.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to fetch.
 * @returns A promise that resolves to the channel object or null if not found.
 */
function fetchChannel(client, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = yield client.channels.fetch(channelId);
            if (channel instanceof discord_js_1.TextChannel) {
                return channel;
            }
            return null;
        }
        catch (error) {
            console.error('Error fetching channel:', error);
            return null;
        }
    });
}
