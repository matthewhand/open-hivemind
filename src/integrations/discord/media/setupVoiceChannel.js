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
exports.setupVoiceChannel = setupVoiceChannel;
const discord_js_1 = require("discord.js");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:setupVoiceChannel');
/**
 * Setup Voice Channel
 *
 * This function handles the setup of a voice channel in Discord.
 * It ensures that the channel is ready for use and manages any necessary configurations.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to set up.
 * @returns The configured voice channel object.
 */
function setupVoiceChannel(client, channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = yield client.channels.fetch(channelId);
            if (!channel || channel.type !== discord_js_1.ChannelType.GuildVoice) {
                debug('Channel not found or is not a voice channel');
                return null;
            }
            const guildChannel = channel;
            const voiceChannel = channel;
            if (!guildChannel.guild) {
                debug('Voice channel does not belong to a guild');
                return null;
            }
            debug('Voice channel setup complete.');
            return voiceChannel;
        }
        catch (error) {
            debug('Error setting up voice channel: ' + error.message);
            return null;
        }
    });
}
