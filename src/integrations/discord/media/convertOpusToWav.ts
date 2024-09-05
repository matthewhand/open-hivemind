import { exec } from 'child_process';
import fs from 'fs';
import util from 'util';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:convertOpusToWav');
const execPromise = util.promisify(exec);

/**
 * Converts an Opus audio file to WAV using ffmpeg.
 *
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @param {string} outputDir - The directory where the output WAV file will be stored.
 * @returns {Promise<string>} - The path to the converted WAV file.
 */
export async function convertOpusToWav(opusBuffer: Buffer, outputDir: string): Promise<string> {
    try {
        const inputPath = path.join(outputDir, 'input.opus');
        const outputPath = path.join(outputDir, 'output.wav');

        // Write the Opus buffer to a temporary file
        await fs.promises.writeFile(inputPath, opusBuffer);
        debug('Opus file written to:', inputPath);

        // Convert Opus to WAV using ffmpeg
        const ffmpegCmd = `ffmpeg -y -i ${inputPath} ${outputPath}`;
        debug('Executing ffmpeg command:', ffmpegCmd);
        await execPromise(ffmpegCmd);
        debug('Conversion completed:', outputPath);

        // Clean up the input Opus file
        await fs.promises.unlink(inputPath);

        return outputPath;
    } catch (error: any) {
        debug('Error converting Opus to WAV:', error.message);
        throw error;
    }
}
