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
exports.convertOpusToWav = convertOpusToWav;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:convertOpusToWav');
const execPromise = util_1.default.promisify(child_process_1.exec);
/**
 * Converts an Opus audio file to WAV using ffmpeg.
 *
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @param {string} outputDir - The directory where the output WAV file will be stored.
 * @returns {Promise<string>} - The path to the converted WAV file.
 */
function convertOpusToWav(opusBuffer, outputDir) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const inputPath = path_1.default.join(outputDir, 'input.opus');
            const outputPath = path_1.default.join(outputDir, 'output.wav');
            // Write the Opus buffer to a temporary file
            yield fs_1.default.promises.writeFile(inputPath, opusBuffer);
            debug('Opus file written to:', inputPath);
            // Convert Opus to WAV using ffmpeg
            const ffmpegCmd = `ffmpeg -y -i ${inputPath} ${outputPath}`;
            debug('Executing ffmpeg command:', ffmpegCmd);
            yield execPromise(ffmpegCmd);
            debug('Conversion completed:', outputPath);
            // Clean up the input Opus file
            yield fs_1.default.promises.unlink(inputPath);
            return outputPath;
        }
        catch (error) {
            debug('Error converting Opus to WAV:', error.message);
            throw error;
        }
    });
}
