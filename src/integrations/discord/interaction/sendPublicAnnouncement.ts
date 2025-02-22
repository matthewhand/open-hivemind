const DiscordLib = require('discord.js');
const DebugSA = require('debug');
const Discord = require('../DiscordService');

const discordSvc = Discord.DiscordService.getInstance();

const log = DebugSA('app:sendPublicAnnouncement');

async function sendPublicAnnouncement(channelId: string, announcement: { title?: string; description?: string; color?: string }): Promise<void> {
  const client = discordSvc.client;

  const embed = new DiscordLib.EmbedBuilder()
    .setTitle(announcement.title || '📢 Public Announcement')
    .setDescription(announcement.description || 'No description provided')
    .setColor(announcement.color || '#0099ff')
    .setTimestamp();

  try {
    const channel = await client.channels.fetch(channelId);
    if (!(channel instanceof DiscordLib.TextChannel || channel instanceof DiscordLib.DMChannel)) {
      throw new Error('Unsupported channel type.');
    }
    if (channel instanceof DiscordLib.PartialGroupDMChannel) {
      throw new Error('Cannot send messages to PartialGroupDMChannel.');
    }

    await channel.send({ embeds: [embed] });
    log(`Announcement sent to channel ${channelId}`);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    log(`Failed to send announcement: ${err.message}`);
    throw err;
  }
}

module.exports = { sendPublicAnnouncement };
