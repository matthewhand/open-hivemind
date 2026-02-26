import type { VoiceConnection } from '@discordjs/voice';
/**
 * Play Welcome Message
 *
 * This function plays a welcome message in a Discord voice channel. It uses the OpenAI API to generate the speech,
 * and stores the generated audio file in a configurable path. If the audio file already exists, it is reused to
 * minimize API requests. The function handles errors, missing configurations, and logs relevant information.
 *
 * Key Features:
 * - Speech generation using OpenAI's text-to-speech capability
 * - Configurable audio file storage path
 * - Plays audio in a Discord voice channel
 * - Reuses existing audio files when possible to minimize API requests
 *
 * @param {VoiceConnection} connection - The voice connection to use for playing the welcome message.
 * @returns {Promise<void>} - A promise that resolves when the welcome message has been played.
 */
export declare function playWelcomeMessage(connection: VoiceConnection): Promise<void>;
//# sourceMappingURL=playWelcomeMessage.d.ts.map