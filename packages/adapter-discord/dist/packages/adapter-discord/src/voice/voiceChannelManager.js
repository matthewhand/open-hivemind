"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceChannelManager = void 0;
const voice_1 = require("@discordjs/voice");
const connectToVoiceChannel_1 = require("../interaction/connectToVoiceChannel");
const voiceCommandHandler_1 = require("./voiceCommandHandler");
const voiceActivityDetection_1 = require("./voiceActivityDetection");
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:discord:voiceManager');
class VoiceChannelManager {
    constructor(client) {
        this.connections = new Map();
        this.handlers = new Map();
        this.vadSystems = new Map();
        this.client = client;
    }
    async joinChannel(channelId, autoListen = true) {
        try {
            if (this.connections.has(channelId)) {
                return this.connections.get(channelId);
            }
            const connection = await (0, connectToVoiceChannel_1.connectToVoiceChannel)(this.client, channelId);
            this.connections.set(channelId, connection);
            if (autoListen) {
                const handler = new voiceCommandHandler_1.VoiceCommandHandler(connection);
                const vad = new voiceActivityDetection_1.VoiceActivityDetection(connection);
                this.handlers.set(channelId, handler);
                this.vadSystems.set(channelId, vad);
                handler.startListening();
                debug(`Joined channel ${channelId} with voice command listening enabled`);
            }
            connection.on(voice_1.VoiceConnectionStatus.Disconnected, () => {
                this.cleanup(channelId);
            });
            return connection;
        }
        catch (error) {
            const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
            const classification = errors_1.ErrorUtils.classifyError(hivemindError);
            debug(`Voice channel manager join error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
            // Log with appropriate level
            if (classification.logLevel === 'error') {
                console.error('Discord voice channel manager join error:', hivemindError);
            }
            throw errors_1.ErrorUtils.createError(`Failed to join voice channel: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_VOICE_CHANNEL_MANAGER_JOIN_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error, channelId });
        }
    }
    leaveChannel(channelId) {
        const connection = this.connections.get(channelId);
        if (connection) {
            connection.destroy();
            this.cleanup(channelId);
            debug(`Left channel ${channelId}`);
        }
    }
    leaveAllChannels() {
        for (const channelId of this.connections.keys()) {
            this.leaveChannel(channelId);
        }
    }
    cleanup(channelId) {
        this.connections.delete(channelId);
        this.handlers.delete(channelId);
        this.vadSystems.delete(channelId);
    }
    getConnection(channelId) {
        return this.connections.get(channelId);
    }
    getHandler(channelId) {
        return this.handlers.get(channelId);
    }
    getVAD(channelId) {
        return this.vadSystems.get(channelId);
    }
    getActiveChannels() {
        return Array.from(this.connections.keys());
    }
}
exports.VoiceChannelManager = VoiceChannelManager;
