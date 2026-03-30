import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Convert an Opus audio buffer to WAV format using ffmpeg.
 * @param opusBuffer - The opus audio data as a Buffer
 * @param outputDir - Directory where the WAV file will be written
 * @returns Path to the output WAV file
 */
export async function convertOpusToWav(opusBuffer: Buffer, outputDir: string): Promise<string> {
  const inputPath = path.join(outputDir, 'input.opus');
  const outputPath = path.join(outputDir, 'output.wav');

  await fs.promises.writeFile(inputPath, opusBuffer);

  return new Promise((resolve, reject) => {
    execFile(
      'ffmpeg',
      ['-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', outputPath],
      (error) => {
        // Clean up input file
        fs.promises.unlink(inputPath).catch(() => {});

        if (error) {
          reject(error);
        } else {
          resolve(outputPath);
        }
      }
    );
  });
}
