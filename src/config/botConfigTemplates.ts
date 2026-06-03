import { loadProfiles, saveProfiles } from './profileUtils';

/**
 * A quick-start bot-configuration template surfaced by
 * `GET /webui/api/bot-config/templates`. Each template pairs a message
 * provider with an LLM provider and ships a skeleton config with empty
 * credentials for the user to fill in.
 */
export interface BotConfigTemplate {
  name: string;
  description: string;
  messageProvider: string;
  llmProvider: string;

  config: Record<string, unknown>;
}

/**
 * Map of template id -> template. Kept as a keyed object (not an array) to
 * preserve the existing `/templates` endpoint response shape.
 */
export type BotConfigTemplateMap = Record<string, BotConfigTemplate>;

export const BOT_CONFIG_TEMPLATES_FILE = 'bot-config-templates.json';

/**
 * Shippable default templates. These are written to
 * `config/bot-config-templates.json` on first load; afterwards the file is the
 * source of truth, so new templates can be added without code changes.
 */
const DEFAULT_BOT_CONFIG_TEMPLATES: BotConfigTemplateMap = {
  discord_openai: {
    name: 'Discord + OpenAI Bot',
    description: 'A Discord bot using OpenAI for responses',
    messageProvider: 'discord',
    llmProvider: 'openai',
    config: {
      discord: {
        token: '',
        voiceChannelId: '',
      },
      openai: {
        apiKey: '',
        model: 'gpt-3.5-turbo',
      },
    },
  },
  slack_flowise: {
    name: 'Slack + Flowise Bot',
    description: 'A Slack bot using Flowise for AI responses',
    messageProvider: 'slack',
    llmProvider: 'flowise',
    config: {
      slack: {
        botToken: '',
        signingSecret: '',
        appToken: '',
      },
      flowise: {
        apiKey: '',
        endpoint: '',
      },
    },
  },
  mattermost_openwebui: {
    name: 'Mattermost + OpenWebUI Bot',
    description: 'A Mattermost bot using OpenWebUI for responses',
    messageProvider: 'mattermost',
    llmProvider: 'openwebui',
    config: {
      mattermost: {
        serverUrl: '',
        token: '',
      },
      openwebui: {
        apiKey: '',
        endpoint: '',
      },
    },
  },
};

const isTemplate = (value: unknown): value is BotConfigTemplate => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const t = value as Record<string, unknown>;
  return (
    typeof t.name === 'string' &&
    typeof t.description === 'string' &&
    typeof t.messageProvider === 'string' &&
    typeof t.llmProvider === 'string' &&
    typeof t.config === 'object' &&
    t.config !== null
  );
};

/**
 * Load bot-configuration templates. Defaults are scaffolded into
 * `config/bot-config-templates.json` on first run; subsequent edits to that
 * file are picked up without code changes. Invalid files fall back to the
 * shipped defaults.
 */
export const loadBotConfigTemplates = (): BotConfigTemplateMap => {
  return loadProfiles<BotConfigTemplateMap>({
    filename: BOT_CONFIG_TEMPLATES_FILE,
    defaultData: DEFAULT_BOT_CONFIG_TEMPLATES,
    profileType: 'bot-config-template',
    validateAndMigrate: (parsed) => {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('bot-config templates must be a keyed object');
      }
      const entries = Object.entries(parsed as Record<string, unknown>);
      const valid: BotConfigTemplateMap = {};
      for (const [id, template] of entries) {
        if (!isTemplate(template)) {
          throw new Error(`Invalid bot-config template for id "${id}"`);
        }
        valid[id] = template;
      }
      return valid;
    },
  });
};

export const saveBotConfigTemplates = (templates: BotConfigTemplateMap): void => {
  saveProfiles(BOT_CONFIG_TEMPLATES_FILE, templates);
};

export const getDefaultBotConfigTemplates = (): BotConfigTemplateMap => ({
  ...DEFAULT_BOT_CONFIG_TEMPLATES,
});
