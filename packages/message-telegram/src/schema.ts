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
  maturity?: 'stable' | 'beta' | 'experimental';
  notes?: string;
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
  maturity: 'stable',
  notes:
    'Send + long-poll receive via getUpdates. Bot API does not support channel history retrieval.',
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
