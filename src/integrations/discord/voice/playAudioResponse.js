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
exports.playAudioResponse = playAudioResponse;
const voice_1 = require("@discordjs/voice");
const discordConfig_1 = __importDefault(require("@integrations/discord/interfaces/discordConfig"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:playAudioResponse');
/**
 * Plays an audio response in a Discord voice channel.
 *
 * This function handles the connection to a Discord voice channel and plays the specified audio file. It uses settings
 * from discordConfig to locate the audio files and manage the playback. Detailed debugging and error handling are included
 * to ensure reliable playback and to handle any issues that arise.
 *
 * Key Features:
 * - **Voice Channel Management**: Joins the voice channel and handles connection events.
 * - **Audio Playback**: Plays the specified audio file using Discord.js voice utilities.
 * - **Debugging and Error Handling**: Includes detailed logging for connection status and playback issues.
 */
function playAudioResponse(client, guildMember, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const voiceChannel = guildMember.voice.channel;
            if (!voiceChannel) {
                throw new Error('User is not in a voice channel.');
            }
            const audioDirectory = discordConfig_1.default.get('DISCORD_AUDIO_FILE_PATH'); // Fix: Correct type and key
            const audioFilePath = path_1.default.join(audioDirectory, fileName); // Fix: Ensure path uses proper directory
            debug(`Playing audio file: ${audioFilePath}`);
            const connection = (0, voice_1.joinVoiceChannel)({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator, // Fix: Correct type casting
            });
            connection.on('stateChange', (oldState, newState) => {
                debug(`Connection transitioned from ${oldState.status} to ${newState.status}`);
            });
            const player = (0, voice_1.createAudioPlayer)();
            const resource = (0, voice_1.createAudioResource)(audioFilePath);
            player.play(resource);
            connection.subscribe(player);
            player.on(voice_1.AudioPlayerStatus.Playing, () => {
                debug('Audio is now playing!');
            });
            player.on(voice_1.AudioPlayerStatus.Idle, () => {
                debug('Audio playback is complete.');
                connection.destroy();
            });
            player.on('error', (error) => {
                debug(`Error during audio playback: ${error.message}`);
                debug(error.stack); // Improvement: log stack trace for better debugging
                connection.destroy();
                throw error;
            });
        }
        catch (error) {
            debug('Failed to play audio response: ' + error.message);
            debug(error.stack); // Improvement: log stack trace for better debugging
            throw error;
        }
    });
}
