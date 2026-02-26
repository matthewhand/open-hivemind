"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playAudioResponse = playAudioResponse;
const debug_1 = __importDefault(require("debug"));
const voice_1 = require("@discordjs/voice");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const debug = (0, debug_1.default)('app:playAudioResponse');
/**
 * Play Audio Response
 *
 * This function converts a given text to speech using a remote narration service and plays the resulting audio in the connected
 * Discord voice channel. It manages the conversion request, handles errors, and ensures the audio is played back smoothly.
 *
 * @param {VoiceConnection} connection - The voice connection to use for playing the audio response.
 * @param {string} text - The text to convert to speech and play.
 * @returns A promise that resolves when the audio response has been played.
 */
async function playAudioResponse(connection, text) {
    var _a;
    if (!openaiConfig_1.default) {
        debug('OpenAI configuration is not loaded.');
        return;
    }
    const narrationEndpointUrl = openaiConfig_1.default.get('OPENAI_BASE_URL');
    if (!narrationEndpointUrl) {
        debug('OPENAI_BASE_URL is not set in the configuration.');
        return;
    }
    debug('OPENAI_BASE_URL: ' + narrationEndpointUrl);
    try {
        const response = await axios_1.default.post(narrationEndpointUrl, {
            input: text,
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        }, {
            headers: {
                'Authorization': 'Bearer ' + openaiConfig_1.default.get('OPENAI_API_KEY'),
            },
        });
        const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
        const writeFile = util_1.default.promisify(fs_1.default.writeFile);
        await writeFile('output.mp3', audioBuffer);
        const player = (0, voice_1.createAudioPlayer)();
        const resource = (0, voice_1.createAudioResource)('output.mp3');
        player.play(resource);
        connection.subscribe(player);
        player.on(voice_1.AudioPlayerStatus.Idle, () => {
            fs_1.default.unlinkSync('output.mp3');
        });
        player.on('error', (error) => {
            debug('Error playing audio response: ' + error.message);
            debug(error.stack); // Improvement: Added stack trace logging for better debugging
        });
    }
    catch (error) {
        if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 408) {
            debug('Request timed out. Retrying...'); // Improvement: Added timeout handling
            return playAudioResponse(connection, text);
        }
        debug('Error generating or playing audio response: ' + (error instanceof Error ? error.message : String(error)));
    }
}
