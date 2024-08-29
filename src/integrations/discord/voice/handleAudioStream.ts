import Debug from "debug";
import { Readable } from 'stream';
import { VoiceConnection } from '@discordjs/voice';
import fs from 'fs';
import { convertOpusToWav } from './convertOpusToWav';
import { transcribeAudio } from './transcribeAudio';
import { playAudioResponse } from './playAudioResponse';
import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@common/config/ConfigurationManager';

const debug = Debug('app:message:handleAudioStream');
const configManager = ConfigurationManager.getInstance();  // Ensure configManager is instantiated

/**
 * Handles the streaming of audio from a Discord voice connection.
 * Processes incoming audio streams, transcribes them, generates a response, and plays it back.
 *
 * @param {Readable} stream - The audio stream to process.
 * @param {VoiceConnection} connection - The Discord voice connection to stream to.
 * @param {IMessage} message - The original message object associated with the stream.
 * @param {OpenAiService} aiService - The OpenAI service instance for generating responses.
 * @returns {Promise<void>} - A promise that resolves when the audio processing is complete.
 */
export const handleAudioStream = async (stream: Readable, connection: VoiceConnection, message: IMessage, aiService: OpenAiService): Promise<void> => {
    const audioChunks: Buffer[] = [];
    const userId = message.getAuthorId();

    debug('handleAudioStream: Initialized for user', { userId });

    stream.on('data', (chunk: Buffer) => {
        debug('Receiving audio data from user', { userId, chunkSize: chunk.length });
        audioChunks.push(chunk);
    });

    stream.on('end', async () => {
        debug('handleAudioStream: End of audio stream for user', { userId });

        try {
            const audioBuffer = Buffer.concat(audioChunks);
            debug('handleAudioStream: Concatenated audio buffer', { bufferSize: audioBuffer.length });

            if (audioBuffer.length === 0) {
                debug('handleAudioStream: Audio buffer is empty, skipping transcription');
                return;
            }

            const wavBuffer = await convertOpusToWav(audioBuffer);
            const audioFilePath = 'audio.wav';
            fs.writeFileSync(audioFilePath, wavBuffer);

            const stats = fs.statSync(audioFilePath);
            debug('handleAudioStream: Saved WAV file', { fileSize: stats.size });

            if (stats.size === 0) {
                debug('handleAudioStream: WAV file size is 0, skipping transcription');
                return;
            }

            const transcript = await transcribeAudio(audioFilePath);

            if (transcript) {
                debug('Transcription successful', { transcript });

                // TODO: Track and pass transcribed history in future.
                const response = await aiService.generateChatResponse(transcript, []);

                if (response) {
                    debug('Generated response', { response });
                    await playAudioResponse(connection, response);
                    debug('Played audio response');
                } else {
                    debug('handleAudioStream: Response generation returned null or undefined');
                }
            } else {
                debug('handleAudioStream: Transcription returned null or undefined');
            }
        } catch (error: any) {
            debug('handleAudioStream: Error processing audio stream', { userId, error: error.message, stack: error.stack });
        }
    });

    stream.on('error', (error: Error) => {
        debug('handleAudioStream: Error in audio stream', { userId, error: error.message, stack: error.stack });
    });
};