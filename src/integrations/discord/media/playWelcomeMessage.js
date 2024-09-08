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
exports.playWelcomeMessage = playWelcomeMessage;
const debug_1 = __importDefault(require("debug"));
const voice_1 = require("@discordjs/voice");
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const discordConfig_1 = __importDefault(require("@integrations/discord/interfaces/discordConfig"));
const openaiConfig_1 = __importDefault(require("@integrations/openai/interfaces/openaiConfig"));
const debug = (0, debug_1.default)('app:playWelcomeMessage');
const defaultDir = './data/';
const defaultFileName = 'welcome.mp3';
const audioDir = discordConfig_1.default.get('DISCORD_AUDIO_FILE_PATH') || defaultDir;
const outputPath = path_1.default.join(audioDir, defaultFileName);
if (!fs_1.default.existsSync(audioDir)) {
    fs_1.default.mkdirSync(audioDir, { recursive: true });
}
const allowedVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
function isAllowedVoice(voice) {
    return allowedVoices.includes(voice);
}
/**
 * Play Welcome Message
 *
 * This function plays a welcome message in a Discord voice channel. It uses the OpenAI API to generate the speech,
 * and stores the generated audio file in a configurable path. If the audio file already exists, it is reused to
 * minimize API requests. The function handles errors, missing configurations, and logs relevant information.
 *
 * Key Features:
 * - Speech generation using OpenAI's text-to-speech capability
 * - Configurable audio file storage path
 * - Plays audio in a Discord voice channel
 * - Reuses existing audio files when possible to minimize API requests
 *
 * @param {VoiceConnection} connection - The voice connection to use for playing the welcome message.
 * @returns {Promise<void>} - A promise that resolves when the welcome message has been played.
 */
function playWelcomeMessage(connection) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!discordConfig_1.default || !openaiConfig_1.default) {
            debug('Configuration is not properly loaded.');
            return;
        }
        const welcomeMessage = discordConfig_1.default.get('DISCORD_WELCOME_MESSAGE') || 'Welcome to the server!';
        const model = openaiConfig_1.default.get('OPENAI_MODEL') || 'text-davinci-003';
        let voice = 'fable';
        // Use OPENAI_VOICE if it exists and is valid
        if (openaiConfig_1.default.get('OPENAI_VOICE') && isAllowedVoice(openaiConfig_1.default.get('OPENAI_VOICE'))) {
            voice = openaiConfig_1.default.get('OPENAI_VOICE');
        }
        debug('Playing welcome message: ' + welcomeMessage);
        const openai = new openai_1.default({
            apiKey: openaiConfig_1.default.get('OPENAI_API_KEY') || ''
        });
        if (fs_1.default.existsSync(outputPath)) {
            debug(`File ${outputPath} already exists. Playing existing file.`);
        }
        else {
            try {
                const response = yield openai.audio.speech.create({
                    model: model,
                    voice: voice,
                    input: welcomeMessage,
                });
                const buffer = Buffer.from(yield response.arrayBuffer());
                const writeFile = util_1.default.promisify(fs_1.default.writeFile);
                yield writeFile(outputPath, buffer);
            }
            catch (error) {
                debug('Error generating welcome message: ' + error.message);
                if (error.response) {
                    debug('Response status: ' + error.response.status);
                    debug('Response data: ' + JSON.stringify(error.response.data));
                }
                debug(error.stack);
                return;
            }
        }
        try {
            const player = (0, voice_1.createAudioPlayer)();
            const resource = (0, voice_1.createAudioResource)(outputPath);
            player.play(resource);
            connection.subscribe(player);
            player.on(voice_1.AudioPlayerStatus.Idle, () => {
                fs_1.default.unlinkSync(outputPath);
            });
            player.on('error', (error) => {
                debug('Error playing welcome message: ' + error.message);
                debug(error.stack);
            });
        }
        catch (error) {
            debug('Error playing audio file: ' + error.message);
            debug(error.stack);
        }
    });
}
