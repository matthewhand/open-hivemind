/**
 * Test data factories for creating consistent test data across test suites
 */

export interface ConfigTestData {
  defaults: Record<string, any>;
  envVars: Record<string, string>;
  expectedResults: Record<string, any>;
}

// Discord Config Test Data
export const discordConfigData: ConfigTestData = {
  defaults: {
    DISCORD_BOT_TOKEN: '',
    DISCORD_CLIENT_ID: '',
    DISCORD_GUILD_ID: '',
    DISCORD_AUDIO_FILE_PATH: 'audio.wav',
    DISCORD_WELCOME_MESSAGE: 'Welcome to the server!',
    DISCORD_CHANNEL_ID: '',
    DISCORD_DEFAULT_CHANNEL_ID: '',
    DISCORD_VOICE_CHANNEL_ID: '',
    DISCORD_PRIORITY_CHANNEL: '',
    DISCORD_MESSAGE_HISTORY_LIMIT: 10,
    DISCORD_UNSOLICITED_CHANCE_MODIFIER: 1.0,
    DISCORD_MAX_MESSAGE_LENGTH: 2000,
    DISCORD_INTER_PART_DELAY_MS: 1000,
    DISCORD_TYPING_DELAY_MAX_MS: 5000,
    DISCORD_PRIORITY_CHANNEL_BONUS: 1.1,
    DISCORD_MESSAGE_PROCESSING_DELAY_MS: 0,
    DISCORD_LOGGING_ENABLED: false,
    DISCORD_CHANNEL_BONUSES: {},
  },
  envVars: {
    DISCORD_BOT_TOKEN: 'test-token-123',
    DISCORD_CLIENT_ID: 'client-id-456',
    DISCORD_GUILD_ID: 'guild-id-789',
    DISCORD_WELCOME_MESSAGE: 'Hello world!',
    DISCORD_MESSAGE_HISTORY_LIMIT: '20',
    DISCORD_MAX_MESSAGE_LENGTH: '4000',
    DISCORD_LOGGING_ENABLED: 'true',
  },
  expectedResults: {
    DISCORD_BOT_TOKEN: 'test-token-123',
    DISCORD_CLIENT_ID: 'client-id-456',
    DISCORD_GUILD_ID: 'guild-id-789',
    DISCORD_WELCOME_MESSAGE: 'Hello world!',
    DISCORD_MESSAGE_HISTORY_LIMIT: 20,
    DISCORD_MAX_MESSAGE_LENGTH: 4000,
    DISCORD_LOGGING_ENABLED: true,
  },
};

// Message Config Test Data
export const messageConfigData: ConfigTestData = {
  defaults: {
    MESSAGE_PROVIDER: 'slack',
    MESSAGE_COMMAND_AUTHORISED_USERS: '',
    MESSAGE_FILTER_BY_USER: '',
    MESSAGE_USERNAME_OVERRIDE: 'Bot',
    BOT_ID: 'slack-bot',
    PLATFORM: 'discord',
    NAME: 'Open-Hivemind',
    MESSAGE_IGNORE_BOTS: false,
    MESSAGE_ADD_USER_HINT: true,
    MESSAGE_ONLY_WHEN_SPOKEN_TO: true,
    MESSAGE_INTERACTIVE_FOLLOWUPS: false,
    MESSAGE_UNSOLICITED_ADDRESSED: false,
    MESSAGE_UNSOLICITED_UNADDRESSED: false,
    MESSAGE_RESPOND_IN_THREAD: false,
    MESSAGE_COMMAND_INLINE: true,
    MESSAGE_LLM_FOLLOW_UP: false,
    MESSAGE_STRIP_BOT_ID: true,
    DISABLE_DELAYS: false,
    MESSAGE_SEMANTIC_RELEVANCE_ENABLED: true,
    MESSAGE_ALLOW_SELF_MENTION: false,
    MESSAGE_SUPPRESS_DUPLICATES: true,
    MESSAGE_RATE_LIMIT_PER_CHANNEL: 5,
    MESSAGE_MIN_DELAY: 1000,
    MESSAGE_MAX_DELAY: 10000,
    MESSAGE_ACTIVITY_TIME_WINDOW: 300000,
    MESSAGE_THREAD_RELATION_WINDOW: 300000,
    MESSAGE_RECENT_ACTIVITY_DECAY_RATE: 0.5,
    MESSAGE_INTERROBANG_BONUS: 0.4,
    MESSAGE_BOT_RESPONSE_MODIFIER: -0.1,
    MESSAGE_MIN_INTERVAL_MS: 3000,
    MESSAGE_HISTORY_LIMIT: 30,
    MESSAGE_DELAY_MULTIPLIER: 3,
    MESSAGE_SEMANTIC_RELEVANCE_BONUS: 10,
    MESSAGE_WAKEWORDS: ['!help', '!ping'],
    CHANNEL_BONUSES: {},
    CHANNEL_PRIORITIES: {},
  },
  envVars: {
    MESSAGE_PROVIDER: 'discord',
    MESSAGE_USERNAME_OVERRIDE: 'TestBot',
    BOT_ID: 'test-bot-123',
    MESSAGE_COMMAND_AUTHORISED_USERS: 'user1,user2',
    MESSAGE_IGNORE_BOTS: 'true',
    MESSAGE_ADD_USER_HINT: 'false',
    MESSAGE_ONLY_WHEN_SPOKEN_TO: 'false',
    DISABLE_DELAYS: 'true',
    MESSAGE_MIN_DELAY: '2000',
    MESSAGE_MAX_DELAY: '15000',
    MESSAGE_RATE_LIMIT_PER_CHANNEL: '10',
    MESSAGE_HISTORY_LIMIT: '50',
    MESSAGE_DELAY_MULTIPLIER: '2.5',
  },
  expectedResults: {
    MESSAGE_PROVIDER: 'discord',
    MESSAGE_USERNAME_OVERRIDE: 'TestBot',
    BOT_ID: 'test-bot-123',
    MESSAGE_COMMAND_AUTHORISED_USERS: 'user1,user2',
    MESSAGE_IGNORE_BOTS: true,
    MESSAGE_ADD_USER_HINT: false,
    MESSAGE_ONLY_WHEN_SPOKEN_TO: false,
    DISABLE_DELAYS: true,
    MESSAGE_MIN_DELAY: 2000,
    MESSAGE_MAX_DELAY: 15000,
    MESSAGE_RATE_LIMIT_PER_CHANNEL: 10,
    MESSAGE_HISTORY_LIMIT: 50,
    MESSAGE_DELAY_MULTIPLIER: 2.5,
  },
};

// Telegram Config Test Data
export const telegramConfigData: ConfigTestData = {
  defaults: {
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_WEBHOOK_URL: '',
    TELEGRAM_PARSE_MODE: 'HTML',
    TELEGRAM_ALLOWED_CHATS: '',
    TELEGRAM_BLOCKED_USERS: '',
    TELEGRAM_ENABLE_COMMANDS: true,
  },
  envVars: {
    TELEGRAM_BOT_TOKEN: 'test-telegram-token-123',
    TELEGRAM_WEBHOOK_URL: 'https://test.example.com/webhook',
    TELEGRAM_PARSE_MODE: 'Markdown',
    TELEGRAM_ALLOWED_CHATS: '12345,67890',
    TELEGRAM_BLOCKED_USERS: '98765',
    TELEGRAM_ENABLE_COMMANDS: 'false',
  },
  expectedResults: {
    TELEGRAM_BOT_TOKEN: 'test-telegram-token-123',
    TELEGRAM_WEBHOOK_URL: 'https://test.example.com/webhook',
    TELEGRAM_PARSE_MODE: 'Markdown',
    TELEGRAM_ALLOWED_CHATS: '12345,67890',
    TELEGRAM_BLOCKED_USERS: '98765',
    TELEGRAM_ENABLE_COMMANDS: false,
  },
};

// Mattermost Config Test Data
export const mattermostConfigData: ConfigTestData = {
  defaults: {
    MATTERMOST_SERVER_URL: '',
    MATTERMOST_TOKEN: '',
    MATTERMOST_CHANNEL: '',
  },
  envVars: {
    MATTERMOST_SERVER_URL: 'https://mattermost.example.com',
    MATTERMOST_TOKEN: 'test-mattermost-token-123',
    MATTERMOST_CHANNEL: 'town-square',
  },
  expectedResults: {
    MATTERMOST_SERVER_URL: 'https://mattermost.example.com',
    MATTERMOST_TOKEN: 'test-mattermost-token-123',
    MATTERMOST_CHANNEL: 'town-square',
  },
};

// Webhook Config Test Data
export const webhookConfigData: ConfigTestData = {
  defaults: {
    WEBHOOK_ENABLED: false,
    WEBHOOK_URL: '',
    WEBHOOK_TOKEN: '',
    WEBHOOK_IP_WHITELIST: '',
    WEBHOOK_PORT: 80,
  },
  envVars: {
    WEBHOOK_ENABLED: 'true',
    WEBHOOK_URL: 'https://webhook.example.com/receive',
    WEBHOOK_TOKEN: 'test-webhook-token-123',
    WEBHOOK_IP_WHITELIST: '127.0.0.1,192.168.1.1',
    WEBHOOK_PORT: '8080',
  },
  expectedResults: {
    WEBHOOK_ENABLED: true,
    WEBHOOK_URL: 'https://webhook.example.com/receive',
    WEBHOOK_TOKEN: 'test-webhook-token-123',
    WEBHOOK_IP_WHITELIST: '127.0.0.1,192.168.1.1',
    WEBHOOK_PORT: 8080,
  },
};

// Slack Config Test Data
export const slackConfigData: ConfigTestData = {
  defaults: {
    SLACK_BOT_TOKEN: '',
    SLACK_APP_TOKEN: '',
    SLACK_SIGNING_SECRET: '',
    SLACK_JOIN_CHANNELS: '',
    SLACK_DEFAULT_CHANNEL_ID: '',
    WELCOME_RESOURCE_URL: 'https://university.example.com/resources',
    REPORT_ISSUE_URL: 'https://university.example.com/report-issue',
    SLACK_MODE: 'socket',
  },
  envVars: {
    SLACK_BOT_TOKEN: 'xoxb-test-token-123',
    SLACK_APP_TOKEN: 'xapp-test-app-token-456',
    SLACK_SIGNING_SECRET: 'test-signing-secret-789',
    SLACK_JOIN_CHANNELS: 'C1234567890,C0987654321',
    SLACK_DEFAULT_CHANNEL_ID: 'C1234567890',
    SLACK_MODE: 'rtm',
    WELCOME_RESOURCE_URL: 'https://custom.example.com/welcome',
    REPORT_ISSUE_URL: 'https://custom.example.com/report',
  },
  expectedResults: {
    SLACK_BOT_TOKEN: 'xoxb-test-token-123',
    SLACK_APP_TOKEN: 'xapp-test-app-token-456',
    SLACK_SIGNING_SECRET: 'test-signing-secret-789',
    SLACK_JOIN_CHANNELS: 'C1234567890,C0987654321',
    SLACK_DEFAULT_CHANNEL_ID: 'C1234567890',
    SLACK_MODE: 'rtm',
    WELCOME_RESOURCE_URL: 'https://custom.example.com/welcome',
    REPORT_ISSUE_URL: 'https://custom.example.com/report',
  },
};

// OpenAI Config Test Data
export const openaiConfigData: ConfigTestData = {
  defaults: {
    OPENAI_API_KEY: '',
    OPENAI_TEMPERATURE: 0.7,
    OPENAI_MAX_TOKENS: 150,
    OPENAI_FREQUENCY_PENALTY: 0.1,
    OPENAI_PRESENCE_PENALTY: 0.05,
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_TIMEOUT: 10000,
    OPENAI_ORGANIZATION: '',
    OPENAI_MODEL: 'gpt-5.2',
    OPENAI_STOP: [],
    OPENAI_TOP_P: 1.0,
    OPENAI_SYSTEM_PROMPT: 'Greetings, human...',
    OPENAI_RESPONSE_MAX_TOKENS: 100,
    OPENAI_MAX_RETRIES: 3,
    OPENAI_FINISH_REASON_RETRY: 'stop',
    OPENAI_VOICE: 'nova',
  },
  envVars: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_MODEL: 'gpt-4',
    OPENAI_TEMPERATURE: '0.5',
    OPENAI_MAX_TOKENS: '500',
  },
  expectedResults: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_TEMPERATURE: 0.5,
    OPENAI_MAX_TOKENS: 500,
    OPENAI_FREQUENCY_PENALTY: 0.1,
    OPENAI_PRESENCE_PENALTY: 0.05,
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_TIMEOUT: 10000,
    OPENAI_ORGANIZATION: '',
    OPENAI_MODEL: 'gpt-4',
    OPENAI_STOP: [],
    OPENAI_TOP_P: 1.0,
    OPENAI_SYSTEM_PROMPT: 'Greetings, human...',
    OPENAI_RESPONSE_MAX_TOKENS: 100,
    OPENAI_MAX_RETRIES: 3,
    OPENAI_FINISH_REASON_RETRY: 'stop',
    OPENAI_VOICE: 'nova',
  },
};

// Ollama Config Test Data
export const ollamaConfigData: ConfigTestData = {
  defaults: {
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OLLAMA_MODEL: 'llama2',
    OLLAMA_TEMPERATURE: 0.7,
    OLLAMA_SYSTEM_PROMPT: 'You are a helpful AI assistant.',
    OLLAMA_CONTEXT_WINDOW: 4096,
  },
  envVars: {
    OLLAMA_BASE_URL: 'http://ollama:11434',
    OLLAMA_MODEL: 'mistral',
    OLLAMA_TEMPERATURE: '0.8',
  },
  expectedResults: {
    OLLAMA_BASE_URL: 'http://ollama:11434',
    OLLAMA_MODEL: 'mistral',
    OLLAMA_TEMPERATURE: 0.8,
    OLLAMA_SYSTEM_PROMPT: 'You are a helpful AI assistant.',
    OLLAMA_CONTEXT_WINDOW: 4096,
  },
};

// OpenWebUI Config Test Data
export const openWebUIConfigData: ConfigTestData = {
  defaults: {
    OPEN_WEBUI_API_URL: 'http://host.docker.internal:3000/api/',
    OPEN_WEBUI_USERNAME: 'admin',
    OPEN_WEBUI_PASSWORD: 'password123',
    OPEN_WEBUI_KNOWLEDGE_FILE: '',
    OPEN_WEBUI_MODEL: 'llama3.2',
  },
  envVars: {
    OPEN_WEBUI_API_URL: 'http://webui:8080/api/',
    OPEN_WEBUI_USERNAME: 'testuser',
    OPEN_WEBUI_PASSWORD: 'testpassword',
  },
  expectedResults: {
    OPEN_WEBUI_API_URL: 'http://webui:8080/api/',
    OPEN_WEBUI_USERNAME: 'testuser',
    OPEN_WEBUI_PASSWORD: 'testpassword',
    OPEN_WEBUI_KNOWLEDGE_FILE: '',
    OPEN_WEBUI_MODEL: 'llama3.2',
  },
};

// Flowise Config Test Data
export const flowiseConfigData: ConfigTestData = {
  defaults: {
    FLOWISE_API_ENDPOINT: '',
    FLOWISE_API_KEY: '',
    FLOWISE_CONVERSATION_CHATFLOW_ID: '',
    FLOWISE_COMPLETION_CHATFLOW_ID: '',
    FLOWISE_USE_REST: true,
  },
  envVars: {
    FLOWISE_API_ENDPOINT: 'http://flowise:3000',
    FLOWISE_API_KEY: 'test-flowise-key',
    FLOWISE_CONVERSATION_CHATFLOW_ID: 'chat-123',
    FLOWISE_USE_REST: 'false',
  },
  expectedResults: {
    FLOWISE_API_ENDPOINT: 'http://flowise:3000',
    FLOWISE_API_KEY: 'test-flowise-key',
    FLOWISE_CONVERSATION_CHATFLOW_ID: 'chat-123',
    FLOWISE_COMPLETION_CHATFLOW_ID: '',
    FLOWISE_USE_REST: false,
  },
};

// Command Parser Test Data
export const commandParserTestData = {
  validCommands: [
    { input: '!hello', expected: { command: 'hello', args: [] } },
    { input: '!status', expected: { command: 'status', args: [] } },
    { input: '!greet John Doe', expected: { command: 'greet', args: ['John', 'Doe'] } },
    { input: '!say "Hello World"', expected: { command: 'say', args: ['Hello World'] } },
    { input: "!say 'Hello World'", expected: { command: 'say', args: ['Hello World'] } },
    {
      input: '!greet "John Doe" from "New York"',
      expected: { command: 'greet', args: ['John Doe', 'from', 'New York'] },
    },
    { input: '!move   left   right', expected: { command: 'move', args: ['left', 'right'] } },
    { input: '!play123', expected: { command: 'play123', args: [] } },
    { input: '!get_user_info', expected: { command: 'get_user_info', args: [] } },
    { input: '!start-process', expected: { command: 'start-process', args: [] } },
    { input: '!Hello', expected: { command: 'Hello', args: [] } },
  ],
  invalidInputs: ['hello', '', '   ', '!', '!   ', '!cmd "unclosed quote'],
  edgeCases: [
    { input: '!a b c', expected: { command: 'a', args: ['b', 'c'] } },
    { input: '!2fa enable', expected: { command: '2fa', args: ['enable'] } },
    { input: '!user.info', expected: { command: 'user.info', args: [] } },
    { input: '!api.v2.users', expected: { command: 'api.v2.users', args: [] } },
  ],
  performanceTestData: {
    inputs: ['!cmd1', '!cmd2 arg', '!cmd3 arg1 arg2'],
    largeInputs: Array.from({ length: 100 }, (_, i) => `!cmd${i} arg${i}`),
  },
};

import discordConfig from '../../src/config/discordConfig';
import messageConfig from '../../src/config/messageConfig';
import slackConfig from '../../src/config/slackConfig';
import telegramConfig from '../../src/config/telegramConfig';
import mattermostConfig from '../../src/config/mattermostConfig';
import webhookConfig from '../../src/config/webhookConfig';
import openaiConfig from '../../src/config/openaiConfig';
import ollamaConfig from '../../src/config/ollamaConfig';
import openWebUIConfig from '../../src/config/openWebUIConfig';
import flowiseConfig from '../../src/config/flowiseConfig';

/**
 * Validates generated config test data against the real backend convict schema
 * to prevent drift.
 * @param type The config type
 * @param data The generated expectedResults
 * @returns true if valid, throws error otherwise
 */
export function validateConfigAgainstSchema(type: 'discord' | 'message' | 'slack' | 'telegram' | 'mattermost' | 'webhook' | 'openai' | 'ollama' | 'openwebui' | 'flowise', data: any): boolean {
  try {
    switch (type) {
      case 'discord':
        discordConfig.load(data);
        discordConfig.validate({ allowed: 'strict' });
        break;
      case 'message':
        messageConfig.load(data);
        messageConfig.validate({ allowed: 'strict' });
        break;
      case 'slack':
        slackConfig.load(data);
        slackConfig.validate({ allowed: 'strict' });
        break;
      case 'telegram':
        telegramConfig.load(data);
        telegramConfig.validate({ allowed: 'strict' });
        break;
      case 'mattermost':
        mattermostConfig.load(data);
        mattermostConfig.validate({ allowed: 'strict' });
        break;
      case 'webhook':
        webhookConfig.load(data);
        webhookConfig.validate({ allowed: 'strict' });
        break;
      case 'openai':
        openaiConfig.load(data);
        openaiConfig.validate({ allowed: 'strict' });
        break;
      case 'ollama':
        ollamaConfig.load(data);
        ollamaConfig.validate({ allowed: 'warn' });
        break;
      case 'openwebui':
        openWebUIConfig.load(data);
        openWebUIConfig.validate({ allowed: 'strict' });
        break;
      case 'flowise':
        flowiseConfig.load(data);
        flowiseConfig.validate({ allowed: 'strict' });
        break;
    }
    return true;
  } catch (error) {
    console.error(`Schema drift detected for ${type}:`, error);
    throw error;
  }
}

/**
 * Generates strongly-typed test data for different platform and command scenarios
 */
export type CommandParserTestData = typeof commandParserTestData;

export function createTestData(type: 'discord'): ConfigTestData;
export function createTestData(type: 'message'): ConfigTestData;
export function createTestData(type: 'slack'): ConfigTestData;
export function createTestData(type: 'telegram'): ConfigTestData;
export function createTestData(type: 'mattermost'): ConfigTestData;
export function createTestData(type: 'webhook'): ConfigTestData;
export function createTestData(type: 'openai'): ConfigTestData;
export function createTestData(type: 'ollama'): ConfigTestData;
export function createTestData(type: 'openwebui'): ConfigTestData;
export function createTestData(type: 'flowise'): ConfigTestData;
export function createTestData(type: 'command'): CommandParserTestData;
export function createTestData(
  type: 'discord' | 'message' | 'slack' | 'telegram' | 'mattermost' | 'webhook' | 'openai' | 'ollama' | 'openwebui' | 'flowise' | 'command'
): ConfigTestData | CommandParserTestData {
  let data;
  switch (type) {
    case 'discord':
      return discordConfigData;
    case 'message':
      return messageConfigData;
    case 'slack':
      data = slackConfigData;
      break;
    case 'telegram':
      data = telegramConfigData;
      break;
    case 'mattermost':
      data = mattermostConfigData;
      break;
    case 'webhook':
      data = webhookConfigData;
      break;
    case 'openai':
      data = openaiConfigData;
      break;
    case 'ollama':
      data = ollamaConfigData;
      break;
    case 'openwebui':
      data = openWebUIConfigData;
      break;
    case 'flowise':
      data = flowiseConfigData;
      break;
    case 'command':
      return commandParserTestData;
    default:
      throw new Error(`Unknown test data type: ${type}`);
  }

  // Validate the data against the schema
  validateConfigAgainstSchema(type as 'discord' | 'message' | 'slack' | 'telegram' | 'mattermost' | 'webhook' | 'openai' | 'ollama' | 'openwebui' | 'flowise', data.expectedResults);
  return data;
}

/**
 * Helper to generate performance test data
 */
export function generatePerformanceTestData(
  count: number,
  prefix = 'test'
): Array<{ input: string; expected: any }> {
  return Array.from({ length: count }, (_, i) => ({
    input: `!${prefix}${i} arg${i}`,
    expected: { command: `${prefix}${i}`, args: [`arg${i}`] },
  }));
}
