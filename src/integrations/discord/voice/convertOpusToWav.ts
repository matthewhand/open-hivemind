import Debug from "debug";
import { spawn } from 'child_process';
import { Readable } from 'stream';

const debug = Debug('app:convertOpusToWav');

/**
 * Convert Opus to WAV
 *
 * This function converts an Opus audio buffer to WAV format using FFmpeg. It handles the streaming of audio data between 
 * the bot and FFmpeg, capturing errors, and ensuring that the output is a valid WAV buffer.
 *
 * Key Features:
 * - Utilizes FFmpeg to convert Opus audio to WAV format, ensuring compatibility with various audio processing tasks.
 * - Handles errors during the conversion process, logging them for debugging and providing meaningful feedback.
 * - Streams data efficiently between the bot and FFmpeg, minimizing latency and memory usage.
 * - Returns a promise that resolves to the converted WAV buffer or rejects with an error if conversion fails.
 *
 * @param opusBuffer - The buffer containing Opus audio data.
 * @returns A promise that resolves to a Buffer containing WAV audio data.
 */
export async function convertOpusToWav(opusBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-f', 'opus',
            '-i', 'pipe:0',
            '-f', 'wav',
            'pipe:1'
        ]);
        const output: Buffer[] = [];
        let errorOutput = '';
        ffmpeg.stdout.on('data', (chunk) => {
            output.push(chunk);
            debug('convertOpusToWav: Received chunk of size ' + chunk.length);
        });
        ffmpeg.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        ffmpeg.stdout.on('end', () => {
            const wavBuffer = Buffer.concat(output);
            if (wavBuffer.length === 0) {
                debug('convertOpusToWav: Conversion resulted in empty buffer. Error output: ' + errorOutput);
                reject(new Error('Conversion to WAV resulted in empty buffer'));
            } else {
                debug('convertOpusToWav: Converted buffer size ' + wavBuffer.length);
                resolve(wavBuffer);
            }
        });
        ffmpeg.stdout.on('error', (error) => {
            debug('convertOpusToWav: ffmpeg stdout error: ' + error.message);
            reject(error);
        });
        ffmpeg.stdin.on('error', (error) => {
            debug('convertOpusToWav: ffmpeg stdin error: ' + error.message);
            reject(error);
        });
        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('convertOpusToWav: ffmpeg process exited with code ' + code + '. Error output: ' + errorOutput));
            }
        });
        const input = new Readable();
        input.push(opusBuffer);
        input.push(null);
        (input as any).pipe(ffmpeg.stdin);
    });
}
