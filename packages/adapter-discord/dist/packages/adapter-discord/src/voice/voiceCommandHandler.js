"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCommandHandler = void 0;
const voice_1 = require("@discordjs/voice");
const speechToText_1 = require("./speechToText");
const convertOpusToWav_1 = require("../media/convertOpusToWav");
const getLlmProvider_1 = require("@src/llm/getLlmProvider");
const openai_1 = __importDefault(require("openai"));
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:discord:voiceCommands');
class VoiceCommandHandler {
    constructor(connection) {
        this.isListening = false;
        this.connection = connection;
    }
    async processVoiceInput(opusBuffer) {
        if (!this.isListening) {
            return;
        }
        try {
            const tempDir = './temp';
            if (!fs_1.default.existsSync(tempDir)) {
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            const wavPath = await (0, convertOpusToWav_1.convertOpusToWav)(opusBuffer, tempDir);
            const transcription = await (0, speechToText_1.transcribeAudio)(wavPath);
            if (transcription.trim()) {
                const response = await this.generateResponse(transcription);
                await this.speakResponse(response);
            }
            fs_1.default.unlinkSync(wavPath);
        }
        catch (error) {
            const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
            const classification = errors_1.ErrorUtils.classifyError(hivemindError);
            debug(`Voice processing error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
            // Log with appropriate level
            if (classification.logLevel === 'error') {
                console.error('Discord voice processing error:', hivemindError);
            }
        }
    }
    async generateResponse(text) {
        const llmProviders = (0, getLlmProvider_1.getLlmProvider)();
        if (llmProviders.length === 0) {
            return 'I\'m having trouble processing that.';
        }
        try {
            return await llmProviders[0].generateChatCompletion(text, [], {});
        }
        catch (_a) {
            return 'Sorry, I couldn\'t process that request.';
        }
    }
    async speakResponse(text) {
        const openai = new openai_1.default({
            apiKey: openaiConfig_1.default.get('OPENAI_API_KEY'),
        });
        const tempPath = path_1.default.join('./temp', `response_${Date.now()}.mp3`);
        try {
            const response = await openai.audio.speech.create({
                model: 'tts-1',
                voice: 'nova',
                input: text,
            });
            const buffer = Buffer.from(await response.arrayBuffer());
            fs_1.default.writeFileSync(tempPath, buffer);
            const player = (0, voice_1.createAudioPlayer)();
            const resource = (0, voice_1.createAudioResource)(tempPath);
            player.play(resource);
            this.connection.subscribe(player);
            player.on(voice_1.AudioPlayerStatus.Idle, () => {
                try {
                    if (fs_1.default.existsSync(tempPath)) {
                        fs_1.default.unlinkSync(tempPath);
                    }
                }
                catch (error) {
                    const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
                    debug(`Failed to delete temporary file: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
                }
            });
            // Also handle error cases
            player.on('error', () => {
                try {
                    if (fs_1.default.existsSync(tempPath)) {
                        fs_1.default.unlinkSync(tempPath);
                    }
                }
                catch (error) {
                    const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
                    debug(`Failed to delete temporary file on error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
                }
            });
        }
        catch (error) {
            // Clean up temp file if it was created
            try {
                if (fs_1.default.existsSync(tempPath)) {
                    fs_1.default.unlinkSync(tempPath);
                }
            }
            catch (cleanupError) {
                const hivemindCleanupError = errors_1.ErrorUtils.toHivemindError(cleanupError);
                debug(`Failed to delete temporary file during cleanup: ${errors_1.ErrorUtils.getMessage(hivemindCleanupError)}`);
            }
            const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
            const classification = errors_1.ErrorUtils.classifyError(hivemindError);
            debug(`TTS error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
            // Log with appropriate level
            if (classification.logLevel === 'error') {
                console.error('Discord TTS error:', hivemindError);
            }
        }
    }
    startListening() {
        this.isListening = true;
        debug('Voice command listening started');
    }
    stopListening() {
        this.isListening = false;
        debug('Voice command listening stopped');
    }
}
exports.VoiceCommandHandler = VoiceCommandHandler;
