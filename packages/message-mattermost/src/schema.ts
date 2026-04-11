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
  key: 'mattermost',
  label: 'Mattermost',
  type: 'messenger',
  docsUrl: 'https://developers.mattermost.com/integrate/reference/bot-accounts/',
  fields: {
    required: [
      {
        name: 'MATTERMOST_SERVER_URL',
        type: 'text',
        label: 'Server URL',
        description: 'Your Mattermost server URL e.g. https://your-mattermost.com',
      },
      {
        name: 'MATTERMOST_TOKEN',
        type: 'password',
        label: 'Bot Token',
        description: 'Bot access token from Mattermost',
      },
    ],
    optional: [
      {
        name: 'MATTERMOST_TEAM',
        type: 'text',
        label: 'Team',
        description: 'Team name to restrict to',
      },
      {
        name: 'MATTERMOST_CHANNEL',
        type: 'text',
        label: 'Default Channel',
        description: 'Default channel name',
      },
    ],
    advanced: [
      {
        name: 'MATTERMOST_WS_RECONNECT_INTERVAL',
        type: 'number',
        label: 'WebSocket Reconnect Interval',
        description: 'WebSocket reconnect interval ms',
        default: '5000',
      },
      {
        name: 'MATTERMOST_MAX_MESSAGE_LENGTH',
        type: 'number',
        label: 'Max Message Length',
        default: '4000',
      },
    ],
  },
};
