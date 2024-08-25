import Debug from "debug";
const debug = Debug("app");

// src/message/discord/voice/convertOpusToWav.ts
import { spawn } from 'child_process';
import { Readable } from 'stream';
/**
 * Converts Opus audio buffer to WAV format using FFmpeg.
 * Handles errors during conversion and ensures a valid WAV buffer is returned.
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @returns {Promise<Buffer>} The buffer containing WAV audio data.
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
