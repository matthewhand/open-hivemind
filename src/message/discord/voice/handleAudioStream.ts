import { Readable } from 'stream';
import { VoiceConnection } from '@discordjs/voice';
import fs from 'fs';
import logger from '../../../utils/logger';
import { convertOpusToWav } from './convertOpusToWav';
import { transcribeAudio } from './transcribeAudio';
import { generateResponse } from '../interaction/generateResponse';
import { playAudioResponse } from './playAudioResponse';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:discord:handleAudioStream');

/**
 * Handles audio streaming to a Discord voice connection.
 * @param {Readable} stream - The audio stream to handle.
 * @param {VoiceConnection} connection - The voice connection to stream to.
 * @param {IMessage} message - The original message object.
 */
export const handleAudioStream = async (stream: Readable, connection: VoiceConnection, message: IMessage): Promise<void> => {
    const audioChunks: Buffer[] = [];
    const userId = message.getAuthorId();
    logger.debug('handleAudioStream: Initialized for user ' + userId);

    stream.on('data', (chunk: Buffer) => {
        logger.info('Receiving audio data from user ' + userId);
        audioChunks.push(chunk);
        logger.debug('handleAudioStream: Collected audio chunk of size ' + chunk.length);
    });

    stream.on('end', async () => {
        logger.debug('handleAudioStream: End of audio stream for user ' + userId);

        try {
            const audioBuffer = Buffer.concat(audioChunks);
            logger.debug('handleAudioStream: Concatenated audio buffer size ' + audioBuffer.length);

            if (audioBuffer.length === 0) {
                logger.warn('handleAudioStream: Audio buffer is empty, skipping transcription');
                return;
            }

            const wavBuffer = await convertOpusToWav(audioBuffer);
            const audioFilePath = 'audio.wav';
            fs.writeFileSync(audioFilePath, wavBuffer);

            const stats = fs.statSync(audioFilePath);
            logger.debug('handleAudioStream: Saved WAV file size ' + stats.size);

            if (stats.size === 0) {
                logger.warn('handleAudioStream: WAV file size is 0, skipping transcription');
                return;
            }

            const transcript = await transcribeAudio(audioFilePath);
            if (transcript) {
                logger.info('Transcription: ' + transcript);
                logger.debug('handleAudioStream: Transcription successful');

                const response = await generateResponse(transcript);
                if (response) {
                    logger.debug('handleAudioStream: Generated response: ' + response);
                    await playAudioResponse(connection, response);
                    logger.debug('handleAudioStream: Played audio response');
                } else {
                    logger.warn('handleAudioStream: Response generation returned null or undefined');
                }
            } else {
                logger.warn('handleAudioStream: Transcription returned null or undefined');
            }
        } catch (error: any) {
            logger.error('handleAudioStream: Error processing audio stream for user ' + userId + ': ' + (error instanceof Error ? error.message : String(error)));
            logger.debug('handleAudioStream: Error stack trace: ' + error.stack);
        }
    });

    stream.on('error', (error: Error) => {
        logger.error('handleAudioStream: Error in audio stream for user ' + userId + ': ' + error.message);
        logger.debug('handleAudioStream: Stream error stack trace: ' + error.stack);
    });
};
