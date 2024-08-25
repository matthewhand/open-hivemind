import { CommandInteraction, GuildMember } from 'discord.js';
import Debug from 'debug';

const debug = Debug('app:command:muteUser');

/**
 * Mute a user in the guild using a bot command.
 * @param interaction - The command interaction that triggered the mute.
 * @param target - The target guild member to mute.
 */
export async function muteUser(
  interaction: CommandInteraction,
  target: GuildMember
): Promise<void> {
  try {
    if (!interaction || !target) {
      debug('Invalid interaction or target provided.');
      throw new Error('Interaction and target are required to mute a user.');
    }

    // Check if the target is in a voice channel and can be muted
    if (!target.voice.channel) {
      debug('Target user ' + target.user.tag + ' is not in a voice channel.');
      await interaction.reply(`User ${target.user.tag} is not in a voice channel.`);
      return;
    }

    // Attempt to mute the target user
    await target.voice.setMute(true, 'Muted by bot command');
    debug('User ' + target.user.tag + ' has been muted in guild ' + interaction.guildId);

    // Confirm the mute operation
    await interaction.reply(`User ${target.user.tag} has been muted.`);
  } catch (error) {
    debug('Failed to mute user: ' + (target ? target.user.tag : 'unknown user'), error);
    await interaction.reply(`Failed to mute ${target ? target.user.tag : 'the user'}.`);
  }
}
