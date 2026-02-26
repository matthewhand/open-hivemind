import type { VoiceConnection } from '@discordjs/voice';
/**
 * Play Audio Response
 *
 * This function converts a given text to speech using a remote narration service and plays the resulting audio in the connected
 * Discord voice channel. It manages the conversion request, handles errors, and ensures the audio is played back smoothly.
 *
 * @param {VoiceConnection} connection - The voice connection to use for playing the audio response.
 * @param {string} text - The text to convert to speech and play.
 * @returns A promise that resolves when the audio response has been played.
 */
export declare function playAudioResponse(connection: VoiceConnection, text: string): Promise<void>;
//# sourceMappingURL=playAudioResponse.d.ts.map