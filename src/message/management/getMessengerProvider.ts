import * as path from 'path';
import * as fs from 'fs';

const gmpDebug = require('debug')('app:getMessengerProvider');
const DiscordMgr = require('@integrations/discord/DiscordService');
const SlackMgr = require('@integrations/slack/SlackService');

/**
 * Get Messenger Providers
 *
 * Determines and returns an array of message provider instances based on the
 * configuration specified in messengers.json.
 *
 * @returns Array of initialized message provider instances.
 */
export function getMessengerProvider() {
  const messengersConfigPath = path.join(__dirname, '../../../config/providers/messengers.json');
  const messengersConfig = JSON.parse(fs.readFileSync(messengersConfigPath, 'utf-8'));
  const messengerServices = [];

  if (messengersConfig.discord && messengersConfig.discord.instances.length > 0) {
    messengerServices.push(DiscordMgr.Discord.DiscordService.getInstance());
    gmpDebug(`Initialized Discord provider`);
  }

  if (messengersConfig.slack && messengersConfig.slack.instances.length > 0) {
    messengerServices.push(new SlackMgr.SlackService());
    gmpDebug(`Initialized Slack provider`);
  }

  if (messengerServices.length === 0) {
    gmpDebug('No valid messenger providers initialized, defaulting to Slack');
    messengerServices.push(new SlackMgr.SlackService());
  }

  return messengerServices;
}

module.exports = { getMessengerProvider };
