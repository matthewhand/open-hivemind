"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertOpusToWav = convertOpusToWav;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("@src/types/errors");
const debug = (0, debug_1.default)('app:convertOpusToWav');
const execPromise = util_1.default.promisify(child_process_1.exec);
// Check if ffmpeg is available
let ffmpegAvailable = null;
async function checkFfmpegAvailable() {
    if (ffmpegAvailable !== null) {
        return ffmpegAvailable;
    }
    try {
        await execPromise('ffmpeg -version');
        ffmpegAvailable = true;
        debug('FFmpeg is available');
        return true;
    }
    catch (error) {
        ffmpegAvailable = false;
        debug('FFmpeg is not available:', error instanceof Error ? error.message : 'Unknown error');
        return false;
    }
}
/**
 * Converts an Opus audio file to WAV using ffmpeg.
 *
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @param {string} outputDir - The directory where the output WAV file will be stored.
 * @returns {Promise<string>} - The path to the converted WAV file.
 */
async function convertOpusToWav(opusBuffer, outputDir) {
    try {
        // Check if ffmpeg is available
        const isFfmpegAvailable = await checkFfmpegAvailable();
        if (!isFfmpegAvailable) {
            throw errors_1.ErrorUtils.createError('FFmpeg is not available. Voice features require FFmpeg to be installed. ' +
                'Build with INCLUDE_FFMPEG=true or set LOW_MEMORY_MODE=false to enable voice processing.', 'configuration', 'DISCORD_FFMPEG_UNAVAILABLE', 503, {
                feature: 'voice_processing',
                suggestion: 'Enable FFmpeg in Docker build or install FFmpeg manually',
            });
        }
        const inputPath = path_1.default.join(outputDir, 'input.opus');
        const outputPath = path_1.default.join(outputDir, 'output.wav');
        // Write the Opus buffer to a temporary file
        await fs_1.default.promises.writeFile(inputPath, opusBuffer);
        debug('Opus file written to:', inputPath);
        // Convert Opus to WAV using ffmpeg
        const ffmpegCmd = `ffmpeg -y -i ${inputPath} ${outputPath}`;
        debug('Executing ffmpeg command:', ffmpegCmd);
        await execPromise(ffmpegCmd);
        debug('Conversion completed:', outputPath);
        // Clean up the input Opus file
        await fs_1.default.promises.unlink(inputPath);
        return outputPath;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        debug('Error converting Opus to WAV:', errorMessage);
        // If it's already a HivemindError, rethrow it
        if (error instanceof errors_1.ErrorUtils.toHivemindError(new Error('dummy')).constructor) {
            throw error;
        }
        // Otherwise wrap it in a HivemindError
        throw errors_1.ErrorUtils.createError(`Failed to convert Opus to WAV: ${errorMessage}`, 'processing', 'DISCORD_OPUS_CONVERSION_FAILED', 500, {
            originalError: error,
            inputBufferLength: opusBuffer.length,
            outputDir,
        });
    }
}
