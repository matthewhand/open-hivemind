import Debug from 'debug';
import { CommandInteraction, GuildMember } from 'discord.js';

const debug = Debug('app:muteUser');

/**
 * Mute a User in Discord via Command
 * 
 * Provides functionality to mute a user in a Discord guild through a bot command.
 * Validates the interaction and target user, checks if the user is in a voice channel, and mutes them.
 * Replies to the interaction with the result of the operation.
 * 
 * @param interaction - The command interaction that triggered the mute.
 * @param target - The target guild member to mute.
 */
export async function muteUser(
  interaction: CommandInteraction,
  target: GuildMember
): Promise<void> {
  try {
    // Validate the interaction and target
    if (!interaction) {
      debug('No interaction provided.');
      throw new Error('Interaction is required to mute a user.');
    }
    if (!target) {
      debug('No target provided.');
      throw new Error('Target is required to mute a user.');
    }

    // Check if the target is in a voice channel and can be muted
    if (!target.voice.channel) {
      debug('Target user ' + target.user.tag + ' is not in a voice channel in guild ' + interaction.guildId);
      await interaction.reply('User ' + target.user.tag + ' is not in a voice channel.');
      return;
    }

    // Attempt to mute the target user
    await target.voice.setMute(true, 'Muted by bot command');
    debug('User ' + target.user.tag + ' has been muted in guild ' + interaction.guildId);

    // Confirm the mute operation
    await interaction.reply('User ' + target.user.tag + ' has been muted.');
  } catch (error: any) {
    const targetInfo = target ? target.user.tag : 'unknown user';
    debug('Failed to mute user ' + targetInfo + ' in guild ' + interaction.guildId + ': ' + error.message);
    await interaction.reply('Failed to mute ' + (target ? target.user.tag : 'the user') + '.');
  }
}
