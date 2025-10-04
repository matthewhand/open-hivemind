import { ProviderConfigSchema } from '../types';

export const slackProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'slack',
  displayName: 'Slack',
  description: 'Connect to Slack workspaces with your app',
  icon: '🔷',
  color: '#4A154B',
  defaultConfig: {
    socketMode: true
  },
  fields: [
    {
      name: 'botToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      description: 'Your Slack bot token starting with xoxb-',
      placeholder: 'xoxb-[your-bot-token-here]',
      group: 'Authentication'
    },
    {
      name: 'appToken',
      label: 'App Token',
      type: 'password',
      required: true,
      description: 'Your Slack app token starting with xapp-',
      placeholder: 'xapp-[your-app-token-here]',
      group: 'Authentication'
    },
    {
      name: 'signingSecret',
      label: 'Signing Secret',
      type: 'password',
      required: true,
      description: 'Your Slack app signing secret',
      placeholder: '[your-signing-secret-here]',
      group: 'Authentication'
    },
    {
      name: 'socketMode',
      label: 'Socket Mode',
      type: 'boolean',
      required: true,
      description: 'Use Socket Mode for real-time communication',
      defaultValue: true,
      group: 'Connection'
    },
    {
      name: 'teamId',
      label: 'Team ID (Optional)',
      type: 'text',
      required: false,
      description: 'Specific Slack workspace to connect to (leave empty for all workspaces)',
      placeholder: 'T[workspace-id]',
      group: 'Connection'
    },
    {
      name: 'channelId',
      label: 'Default Channel (Optional)',
      type: 'text',
      required: false,
      description: 'Default channel for bot messages',
      placeholder: 'C[channel-id]',
      group: 'Connection'
    },
    {
      name: 'allowedChannels',
      label: 'Allowed Channels',
      type: 'text',
      required: false,
      description: 'Comma-separated list of channel IDs the bot can respond in (leave empty for all)',
      placeholder: 'C[channel-id], D[channel-id]',
      group: 'Permissions'
    },
    {
      name: 'blockedUsers',
      label: 'Blocked Users',
      type: 'text',
      required: false,
      description: 'Comma-separated list of user IDs the bot cannot respond to',
      placeholder: 'U[user-id], U[user-id]',
      group: 'Permissions'
    }
  ]
};