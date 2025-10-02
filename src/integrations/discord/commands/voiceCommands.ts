import { SlashCommandBuilder } from '@discordjs/builders';
import { connectToVoiceChannel } from '../interaction/connectToVoiceChannel';
import { VoiceCommandHandler } from '../voice/voiceCommandHandler';

export const joinVoiceCommand = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Join your voice channel');

export const leaveVoiceCommand = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Leave the voice channel');

export const listenCommand = new SlashCommandBuilder()
  .setName('listen')
  .setDescription('Start listening for voice commands');

export async function handleJoinVoice(interaction: any): Promise<void> {
  const member = interaction.member;
  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply('You need to be in a voice channel!');
    return;
  }

  try {
    await connectToVoiceChannel(interaction.client, voiceChannel.id);
    await interaction.reply(`Joined ${voiceChannel.name}!`);
  } catch (error: any) {
    await interaction.reply(`Failed to join voice channel: ${error.message}`);
  }
}

export async function handleLeaveVoice(interaction: any): Promise<void> {
  const connection = interaction.guild?.voiceConnection;
  if (connection) {
    connection.destroy();
    await interaction.reply('Left the voice channel!');
  } else {
    await interaction.reply('Not in a voice channel!');
  }
}

export async function handleStartListening(interaction: any): Promise<void> {
  const member = interaction.member;
  const voiceChannel = member?.voice?.channel;

  if (!voiceChannel) {
    await interaction.reply('You need to be in a voice channel!');
    return;
  }

  try {
    const connection = await connectToVoiceChannel(interaction.client, voiceChannel.id);
    const handler = new VoiceCommandHandler(connection);
    handler.startListening();
    await interaction.reply('Now listening for voice commands!');
  } catch (error: any) {
    await interaction.reply(`Failed to start listening: ${error.message}`);
  }
}