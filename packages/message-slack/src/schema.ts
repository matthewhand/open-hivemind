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
  key: 'slack',
  label: 'Slack',
  type: 'messenger',
  docsUrl: 'https://api.slack.com/start',
  fields: {
    required: [
      {
        name: 'SLACK_BOT_TOKEN',
        type: 'password',
        label: 'Bot Token',
        description: 'Bot User OAuth Token from api.slack.com',
      },
      {
        name: 'SLACK_APP_TOKEN',
        type: 'password',
        label: 'App Token',
        description: 'App-Level Token (starts with xapp-) for Socket Mode',
      },
    ],
    optional: [
      {
        name: 'SLACK_SIGNING_SECRET',
        type: 'password',
        label: 'Signing Secret',
        description: 'Signing secret for request verification',
      },
    ],
    advanced: [
      {
        name: 'SLACK_MAX_MESSAGE_LENGTH',
        type: 'number',
        label: 'Max Message Length',
        default: '3000',
      },
      {
        name: 'SLACK_SOCKET_MODE',
        type: 'boolean',
        label: 'Socket Mode',
        default: 'true',
      },
    ],
  },
};
