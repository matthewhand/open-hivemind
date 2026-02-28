import path from 'path';
import Debug from 'debug';
import type { Client, GuildMember, VoiceChannel } from 'discord.js';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  type DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import { ErrorUtils, HivemindError } from '@src/types/errors';
import discordConfig from '@config/discordConfig';

const debug = Debug('app:playAudioResponse');

/**
 * Plays an audio response in a Discord voice channel.
 *
 * This function handles the connection to a Discord voice channel and plays the specified audio file. It uses settings
 * from discordConfig to locate the audio files and manage the playback. Detailed debugging and error handling are included
 * to ensure reliable playback and to handle any issues that arise.
 *
 * Key Features:
 * - **Voice Channel Management**: Joins the voice channel and handles connection events.
 * - **Audio Playback**: Plays the specified audio file using Discord.js voice utilities.
 * - **Debugging and Error Handling**: Includes detailed logging for connection status and playback issues.
 */
export async function playAudioResponse(
  client: Client,
  guildMember: GuildMember,
  fileName: string
): Promise<void> {
  try {
    const voiceChannel = guildMember.voice.channel as VoiceChannel;
    if (!voiceChannel) {
      throw new Error('User is not in a voice channel.');
    }

    const audioDirectory = discordConfig.get('DISCORD_AUDIO_DIR') as string;
    const audioFilePath = path.join(audioDirectory, fileName);
    debug(`Playing audio file: ${audioFilePath}`);

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      /**
       * TYPE CAST RATIONALE: discord-api-types version mismatch
       *
       * `discord.js` depends on a newer `discord-api-types` version that added
       * `GuildMemberFlags.IsGuest` and `GatewayIntentBits.AutoModerationConfiguration`.
       * `@discordjs/voice` still depends on an older `discord-api-types` version
       * that does not include these additions.
       *
       * As a result, `VoiceAdapterCreator` (from @discordjs/voice) and
       * `voiceAdapterCreator` (from discord.js) are structurally incompatible at
       * the TypeScript type level, even though they are compatible at runtime.
       *
       * This cast can be removed once @discordjs/voice updates its
       * discord-api-types peer dependency to match discord.js.
       * Track: https://github.com/discordjs/discord.js/issues/9928
       */
      adapterCreator: voiceChannel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    });

    connection.on('stateChange', (oldState, newState) => {
      debug(`Connection transitioned from ${oldState.status} to ${newState.status}`);
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(audioFilePath);
    player.play(resource);

    connection.subscribe(player);

    player.on(AudioPlayerStatus.Playing, () => {
      debug('Audio is now playing!');
    });

    player.on(AudioPlayerStatus.Idle, () => {
      debug('Audio playback is complete.');
      connection.destroy();
    });

    player.on('error', (error) => {
      debug(`Error during audio playback: ${error.message}`);
      debug(error.stack);
      connection.destroy();
      throw error;
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    const classification = ErrorUtils.classifyError(hivemindError);

    debug('Failed to play audio response: ' + ErrorUtils.getMessage(hivemindError));

    // Log with appropriate level including stack trace if available
    if (classification.logLevel === 'error') {
      console.error('Discord play audio response error:', hivemindError);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }

    throw ErrorUtils.createError(
      `Failed to play audio response: ${ErrorUtils.getMessage(hivemindError)}`,
      classification.type,
      'DISCORD_AUDIO_PLAYBACK_ERROR',
      ErrorUtils.getStatusCode(hivemindError),
      { originalError: error }
    );
  }
}
