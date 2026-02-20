import Debug from 'debug';
import type { Client, VoiceChannel } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, type VoiceConnection } from '@discordjs/voice';
import { ErrorUtils, HivemindError } from '@src/types/errors';

const debug = Debug('app:discord:voiceConnection');

export async function connectToVoiceChannel(
  client: Client,
  channelId: string
): Promise<VoiceConnection> {
  try {
    const channel = (await client.channels.fetch(channelId)) as VoiceChannel;
    if (!channel?.isVoiceBased()) {
      throw ErrorUtils.createError(
        `Channel ${channelId} is not a voice channel`,
        'ValidationError' as any,
        'DISCORD_INVALID_VOICE_CHANNEL',
        400,
        { channelId }
      );
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
    });

    return new Promise((resolve, reject) => {
      connection.on(VoiceConnectionStatus.Ready, () => {
        debug(`Connected to voice channel: ${channel.name}`);
        resolve(connection);
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        debug('Voice connection lost');
        connection.destroy();
      });

      setTimeout(() => {
        const timeoutError = ErrorUtils.createError(
          'Voice connection timeout',
          'TimeoutError' as any,
          'DISCORD_VOICE_CONNECTION_TIMEOUT',
          408,
          { channelId }
        );
        reject(timeoutError);
      }, 10000);
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug(`Voice connection error: ${ErrorUtils.getMessage(hivemindError)}`);

    // Log with appropriate level
    if (classification.logLevel === 'error') {
      console.error('Discord voice connection error:', hivemindError);
    }

    throw ErrorUtils.createError(
      `Failed to connect to voice channel: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'DISCORD_VOICE_CONNECTION_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error, channelId }
    );
  }
}
