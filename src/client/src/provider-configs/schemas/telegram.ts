import type { ProviderConfigSchema } from '../types';
import { validateApiKey } from '../../utils/apiKeyValidation';

export const telegramProviderSchema: ProviderConfigSchema = {
  type: 'message',
  providerType: 'telegram',
  displayName: 'Telegram',
  description: 'Connect to Telegram with your bot',
  icon: '✈️',
  color: '#0088CC',
  defaultConfig: {
    parseMode: 'HTML',
  },
  fields: [
    {
      name: 'botToken',
      label: 'Bot Token',
      type: 'password',
      required: true,
      description: 'Your Telegram bot token from BotFather (format: bot_id:auth_token)',
      placeholder: '1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789',
      group: 'Authentication',
      validation: {
        pattern: '^\\d{8,10}:[A-Za-z0-9_\\-]{35}$',
        custom: (value: string) => {
          const result = validateApiKey('telegram', value, false);
          if (!result.isValid) {
            return result.message || 'Invalid bot token format';
          }
          return null;
        },
      },
    },
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      type: 'url',
      required: false,
      description: 'URL for receiving updates (leave empty for polling)',
      placeholder: 'https://your-domain.com/api/telegram/webhook',
      group: 'Connection',
    },
    {
      name: 'parseMode',
      label: 'Parse Mode',
      type: 'select',
      required: true,
      description: 'Format for message parsing',
      options: [
        { label: 'HTML', value: 'HTML' },
        { label: 'Markdown', value: 'Markdown' },
        { label: 'None', value: '' },
      ],
      defaultValue: 'HTML',
      group: 'Message Configuration',
    },
    {
      name: 'allowedChats',
      label: 'Allowed Chat IDs',
      type: 'text',
      required: false,
      description: 'Comma-separated list of chat IDs the bot can respond in (leave empty for all)',
      placeholder: '-1001234567890, 123456789',
      group: 'Permissions',
    },
    {
      name: 'blockedUsers',
      label: 'Blocked Users',
      type: 'text',
      required: false,
      description: 'Comma-separated list of user IDs the bot cannot respond to',
      placeholder: '123456789, 987654321',
      group: 'Permissions',
    },
    {
      name: 'enableCommands',
      label: 'Enable Commands',
      type: 'boolean',
      required: false,
      description: 'Enable bot commands (/start, /help, etc.)',
      defaultValue: true,
      group: 'Features',
    },
  ],
};