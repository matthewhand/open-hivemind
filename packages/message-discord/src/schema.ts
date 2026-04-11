export interface ProviderField {
  name: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: string;
  options?: string[];
}

export interface ProviderSchema {
  key: string;
  label: string;
  type: 'messenger';
  docsUrl?: string;
  fields: {
    required: ProviderField[];
    optional: ProviderField[];
    advanced: ProviderField[];
  };
}

export const schema: ProviderSchema = {
  key: 'discord',
  label: 'Discord',
  type: 'messenger',
  docsUrl: 'https://discord.com/developers/docs/intro',
  fields: {
    required: [
      {
        name: 'DISCORD_BOT_TOKEN',
        type: 'password',
        label: 'Bot Token',
        description: 'Bot token from Discord Developer Portal',
      },
    ],
    optional: [
      {
        name: 'DISCORD_CLIENT_ID',
        type: 'text',
        label: 'Client ID',
        description: 'Application client ID',
      },
      {
        name: 'DISCORD_GUILD_ID',
        type: 'text',
        label: 'Guild ID',
        description: 'Server ID to restrict to one guild',
      },
    ],
    advanced: [
      {
        name: 'DISCORD_USERNAME_OVERRIDE',
        type: 'text',
        label: 'Username Override',
        description: 'Comma-separated bot usernames',
      },
      {
        name: 'DISCORD_MAX_MESSAGE_LENGTH',
        type: 'number',
        label: 'Max Message Length',
        default: '2000',
      },
    ],
  },
};
