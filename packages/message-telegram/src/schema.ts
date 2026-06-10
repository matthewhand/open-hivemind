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
  key: 'telegram',
  label: 'Telegram',
  type: 'messenger',
  docsUrl: 'https://core.telegram.org/bots/api',
  fields: {
    required: [
      {
        name: 'TELEGRAM_BOT_TOKEN',
        type: 'password',
        label: 'Bot Token',
        description: 'Bot token from @BotFather (format: <bot_id>:<secret>)',
      },
    ],
    optional: [
      {
        name: 'TELEGRAM_CHAT_ID',
        type: 'text',
        label: 'Default Chat ID',
        description: 'Default chat/channel ID for outbound messages',
      },
    ],
    advanced: [],
  },
};
