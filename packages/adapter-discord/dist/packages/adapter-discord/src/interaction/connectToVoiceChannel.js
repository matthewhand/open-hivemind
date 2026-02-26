"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToVoiceChannel = connectToVoiceChannel;
const voice_1 = require("@discordjs/voice");
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:discord:voiceConnection');
async function connectToVoiceChannel(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!(channel === null || channel === void 0 ? void 0 : channel.isVoiceBased())) {
            throw errors_1.ErrorUtils.createError(`Channel ${channelId} is not a voice channel`, 'ValidationError', 'DISCORD_INVALID_VOICE_CHANNEL', 400, { channelId });
        }
        const connection = (0, voice_1.joinVoiceChannel)({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        return new Promise((resolve, reject) => {
            connection.on(voice_1.VoiceConnectionStatus.Ready, () => {
                debug(`Connected to voice channel: ${channel.name}`);
                resolve(connection);
            });
            connection.on(voice_1.VoiceConnectionStatus.Disconnected, () => {
                debug('Voice connection lost');
                connection.destroy();
            });
            setTimeout(() => {
                const timeoutError = errors_1.ErrorUtils.createError('Voice connection timeout', 'TimeoutError', 'DISCORD_VOICE_CONNECTION_TIMEOUT', 408, { channelId });
                reject(timeoutError);
            }, 10000);
        });
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug(`Voice connection error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord voice connection error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Failed to connect to voice channel: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_VOICE_CONNECTION_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error, channelId });
    }
}
