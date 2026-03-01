import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import Debug from 'debug';
import { ErrorUtils, HivemindError } from '@src/types/errors';

const debug = Debug('app:convertOpusToWav');
const execFilePromise = util.promisify(execFile);

// Check if ffmpeg is available
let ffmpegAvailable: boolean | null = null;

async function checkFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) {
    return ffmpegAvailable;
  }

  try {
    await execFilePromise('ffmpeg', ['-version']);
    ffmpegAvailable = true;
    debug('FFmpeg is available');
    return true;
  } catch (error) {
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
export async function convertOpusToWav(opusBuffer: Buffer, outputDir: string): Promise<string> {
  try {
    // Check if ffmpeg is available
    const isFfmpegAvailable = await checkFfmpegAvailable();
    if (!isFfmpegAvailable) {
      throw ErrorUtils.createError(
        'FFmpeg is not available. Voice features require FFmpeg to be installed. ' +
          'Build with INCLUDE_FFMPEG=true or set LOW_MEMORY_MODE=false to enable voice processing.',
        'configuration' as any,
        'DISCORD_FFMPEG_UNAVAILABLE',
        503,
        {
          feature: 'voice_processing',
          suggestion: 'Enable FFmpeg in Docker build or install FFmpeg manually',
        }
      );
    }

    const inputPath = path.join(outputDir, 'input.opus');
    const outputPath = path.join(outputDir, 'output.wav');

    // Write the Opus buffer to a temporary file
    await fs.promises.writeFile(inputPath, opusBuffer);
    debug('Opus file written to:', inputPath);

    // Convert Opus to WAV using ffmpeg
    const ffmpegArgs = ['-y', '-i', inputPath, outputPath];
    debug('Executing ffmpeg command: ffmpeg', ffmpegArgs.join(' '));
    await execFilePromise('ffmpeg', ffmpegArgs);
    debug('Conversion completed:', outputPath);

    // Clean up the input Opus file
    await fs.promises.unlink(inputPath);

    return outputPath;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug('Error converting Opus to WAV:', errorMessage);

    // If it's already a HivemindError, rethrow it
    if (error instanceof (ErrorUtils.toHivemindError(new Error('dummy')) as any).constructor) {
      throw error;
    }

    // Otherwise wrap it in a HivemindError
    throw ErrorUtils.createError(
      `Failed to convert Opus to WAV: ${errorMessage}`,
      'processing' as any,
      'DISCORD_OPUS_CONVERSION_FAILED',
      500,
      {
        originalError: error,
        inputBufferLength: opusBuffer.length,
        outputDir,
      }
    );
  }
}
