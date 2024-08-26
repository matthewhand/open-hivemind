import Debug from 'debug';
import { CommandInteraction, GuildMember } from 'discord.js';

const debug = Debug('app:banUser');

/**
 * Ban a User in Discord via Command
 * 
 * Provides functionality to ban a user in a Discord guild through a bot command.
 * Validates the interaction and target user, checks if the user can be banned, and bans them.
 * Replies to the interaction with the result of the operation.
 * 
 * @param interaction - The command interaction that triggered the ban.
 * @param target - The target guild member to ban.
 */
export async function banUser(
  interaction: CommandInteraction,
  target: GuildMember
): Promise<void> {
  try {
    // Validate the interaction and target
    if (!interaction) {
      debug('No interaction provided.');
      throw new Error('Interaction is required to ban a user.');
    }
    if (!target) {
      debug('No target provided.');
      throw new Error('Target is required to ban a user.');
    }

    // Check if the target can be banned
    if (!target.bannable) {
      debug('Target user ' + target.user.tag + ' cannot be banned in guild ' + interaction.guildId);
      await interaction.reply('User ' + target.user.tag + ' cannot be banned.');
      return;
    }

    // Attempt to ban the target user
    await target.ban({ reason: 'Banned by bot command' });
    debug('User ' + target.user.tag + ' has been banned in guild ' + interaction.guildId);

    // Confirm the ban operation
    await interaction.reply('User ' + target.user.tag + ' has been banned.');
  } catch (error: any) {
    const targetInfo = target ? target.user.tag : 'unknown user';
    debug('Failed to ban user ' + targetInfo + ' in guild ' + interaction.guildId + ': ' + error.message);
    await interaction.reply('Failed to ban ' + (target ? target.user.tag : 'the user') + '.');
  }
}
