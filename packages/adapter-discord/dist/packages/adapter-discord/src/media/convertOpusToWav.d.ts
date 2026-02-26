/**
 * Converts an Opus audio file to WAV using ffmpeg.
 *
 * @param {Buffer} opusBuffer - The buffer containing Opus audio data.
 * @param {string} outputDir - The directory where the output WAV file will be stored.
 * @returns {Promise<string>} - The path to the converted WAV file.
 */
export declare function convertOpusToWav(opusBuffer: Buffer, outputDir: string): Promise<string>;
//# sourceMappingURL=convertOpusToWav.d.ts.map