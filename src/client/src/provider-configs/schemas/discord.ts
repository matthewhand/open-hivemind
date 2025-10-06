import type { ProviderConfigSchema } from '../types';

export const discordProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'discord',
  displayName: 'Discord',
  description: 'Connect to Discord servers with your bot',
  icon: '💬',
  color: '#5865F2',
  defaultConfig: {
    intents: ['GUILDS', 'GUILD_MESSAGES', 'MESSAGE_CONTENT'],
    presence: {
      status: 'online'
    }
  },
  fields: [
    {
      name: 'botToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      description: 'Your Discord bot token from the Developer Portal',
      placeholder: 'MTk4NzA1MD... (Bot Token)',
      group: 'Authentication'
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      description: 'Your Discord application client ID',
      placeholder: '123456789012345678',
      group: 'Authentication'
    },
    {
      name: 'guildId',
      label: 'Server ID (Optional)',
      type: 'text',
      required: false,
      description: 'Specific Discord server to connect to (leave empty for all servers)',
      placeholder: '876543210987654321',
      group: 'Connection'
    },
    {
      name: 'intents',
      label: 'Bot Intents',
      type: 'multiselect',
      required: true,
      description: 'Gateway intents your bot requires',
      options: [
        { label: 'Guilds', value: 'GUILDS' },
        { label: 'Guild Members', value: 'GUILD_MEMBERS' },
        { label: 'Guild Messages', value: 'GUILD_MESSAGES' },
        { label: 'Message Content', value: 'MESSAGE_CONTENT' },
        { label: 'Guild Message Reactions', value: 'GUILD_MESSAGE_REACTIONS' },
        { label: 'Direct Messages', value: 'DIRECT_MESSAGES' }
      ],
      defaultValue: ['GUILDS', 'GUILD_MESSAGES', 'MESSAGE_CONTENT'],
      group: 'Permissions'
    },
    {
      name: 'commandPrefix',
      label: 'Command Prefix',
      type: 'text',
      required: false,
      description: 'Prefix for bot commands (e.g., !, /, ?)',
      placeholder: '!',
      defaultValue: '!',
      group: 'Commands'
    },
    {
      name: 'allowedChannels',
      label: 'Allowed Channels',
      type: 'text',
      required: false,
      description: 'Comma-separated list of channel IDs the bot can respond in (leave empty for all)',
      placeholder: '123456789012345678, 876543210987654321',
      group: 'Permissions'
    },
    {
      name: 'blockedChannels',
      label: 'Blocked Channels',
      type: 'text',
      required: false,
      description: 'Comma-separated list of channel IDs the bot cannot respond in',
      placeholder: '123456789012345678, 876543210987654321',
      group: 'Permissions'
    }
  ]
};
