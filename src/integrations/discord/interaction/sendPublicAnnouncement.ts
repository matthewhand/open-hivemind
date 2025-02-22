const DiscordLib = require('discord.js');
const Debug = require('debug');
const Discord = require('../DiscordService');

const log = Debug('app:sendPublicAnnouncement');

async function sendPublicAnnouncement(channelId, announcement) {
  const client = Discord.DiscordService.getInstance().client;

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
  } catch (error) {
    log(`Failed to send announcement: ${error.message}`);
    throw error;
  }
}

module.exports = { sendPublicAnnouncement };
