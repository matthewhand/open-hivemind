import { joinVoiceChannel, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { VoiceChannel, Client } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:discord:voiceConnection');

export async function connectToVoiceChannel(client: Client, channelId: string): Promise<VoiceConnection> {
  const channel = await client.channels.fetch(channelId) as VoiceChannel;
  if (!channel?.isVoiceBased()) {
    throw new Error(`Channel ${channelId} is not a voice channel`);
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

    setTimeout(() => reject(new Error('Voice connection timeout')), 10000);
  });
}