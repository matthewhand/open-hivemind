"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const openaiConfig_1 = __importDefault(require("@config/openaiConfig"));
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:discord:stt');
async function transcribeAudio(audioPath) {
    const openai = new openai_1.default({
        apiKey: openaiConfig_1.default.get('OPENAI_API_KEY'),
    });
    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs_1.default.createReadStream(audioPath),
            model: 'whisper-1',
        });
        debug(`Transcribed: ${transcription.text}`);
        return transcription.text;
    }
    catch (error) {
        const hivemindError = errors_1.ErrorUtils.toHivemindError(error);
        const classification = errors_1.ErrorUtils.classifyError(hivemindError);
        debug(`STT error: ${errors_1.ErrorUtils.getMessage(hivemindError)}`);
        // Log with appropriate level
        if (classification.logLevel === 'error') {
            console.error('Discord STT error:', hivemindError);
        }
        throw errors_1.ErrorUtils.createError(`Speech-to-text failed: ${errors_1.ErrorUtils.getMessage(hivemindError)}`, classification.type, 'DISCORD_STT_ERROR', errors_1.ErrorUtils.getStatusCode(hivemindError), { originalError: error });
    }
}
