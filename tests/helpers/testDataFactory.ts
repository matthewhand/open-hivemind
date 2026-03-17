import fc from 'fast-check';
import discordConfig from '../../src/config/discordConfig';
import flowiseConfig from '../../src/config/flowiseConfig';
import mattermostConfig from '../../src/config/mattermostConfig';
import messageConfig from '../../src/config/messageConfig';
import openaiConfig from '../../src/config/openaiConfig';
import openWebUIConfig from '../../src/config/openWebUIConfig';
import slackConfig from '../../src/config/slackConfig';
import telegramConfig from '../../src/config/telegramConfig';
import webhookConfig from '../../src/config/webhookConfig';

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
<<<<<<< HEAD
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
    FLOWISE_API_ENDPOINT: 'http://localhost:3000/api/v1',
    FLOWISE_API_KEY: 'flowise-test-key-123',
    FLOWISE_CONVERSATION_CHATFLOW_ID: 'conv-chatflow-123',
    FLOWISE_COMPLETION_CHATFLOW_ID: 'comp-chatflow-456',
    FLOWISE_USE_REST: 'false',
  },
  expectedResults: {
    FLOWISE_API_ENDPOINT: 'http://localhost:3000/api/v1',
    FLOWISE_API_KEY: 'flowise-test-key-123',
    FLOWISE_CONVERSATION_CHATFLOW_ID: 'conv-chatflow-123',
    FLOWISE_COMPLETION_CHATFLOW_ID: 'comp-chatflow-456',
    FLOWISE_USE_REST: false,
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
    OPEN_WEBUI_API_URL: 'http://localhost:3000/api/',
    OPEN_WEBUI_USERNAME: 'testadmin',
    OPEN_WEBUI_PASSWORD: 'securepassword123',
    OPEN_WEBUI_KNOWLEDGE_FILE: '/path/to/knowledge.txt',
    OPEN_WEBUI_MODEL: 'llama3.3',
  },
  expectedResults: {
    OPEN_WEBUI_API_URL: 'http://localhost:3000/api/',
    OPEN_WEBUI_USERNAME: 'testadmin',
    OPEN_WEBUI_PASSWORD: 'securepassword123',
    OPEN_WEBUI_KNOWLEDGE_FILE: '/path/to/knowledge.txt',
    OPEN_WEBUI_MODEL: 'llama3.3',
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
    OPENAI_EMBEDDING_MODELS: [
      'text-embedding-3-large',
      'text-embedding-3-small',
      'text-embedding-ada-002',
    ],
  },
  envVars: {
    OPENAI_API_KEY: 'sk-test-openai-key',
    OPENAI_TEMPERATURE: '0.9',
    OPENAI_MAX_TOKENS: '500',
    OPENAI_MODEL: 'gpt-4o',
    OPENAI_BASE_URL: 'https://custom.openai.api/v1',
  },
  expectedResults: {
    OPENAI_API_KEY: 'sk-test-openai-key',
    OPENAI_TEMPERATURE: 0.9,
    OPENAI_MAX_TOKENS: 500,
    OPENAI_FREQUENCY_PENALTY: 0.1,
    OPENAI_PRESENCE_PENALTY: 0.05,
    OPENAI_BASE_URL: 'https://custom.openai.api/v1',
    OPENAI_TIMEOUT: 10000,
    OPENAI_ORGANIZATION: '',
    OPENAI_MODEL: 'gpt-4o',
    OPENAI_STOP: [],
    OPENAI_TOP_P: 1.0,
    OPENAI_SYSTEM_PROMPT: 'Greetings, human...',
    OPENAI_RESPONSE_MAX_TOKENS: 100,
    OPENAI_MAX_RETRIES: 3,
    OPENAI_FINISH_REASON_RETRY: 'stop',
    OPENAI_VOICE: 'nova',
    OPENAI_EMBEDDING_MODELS: [
      'text-embedding-3-large',
      'text-embedding-3-small',
      'text-embedding-ada-002',
    ],
=======
>>>>>>> origin/refiner-database-migration-reversibility-3845862468620237629
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

/**
 * Validates generated config test data against the real backend convict schema
 * to prevent drift.
 * @param type The config type
 * @param data The generated expectedResults
 * @returns true if valid, throws error otherwise
 */
export function validateConfigAgainstSchema(
  type:
    | 'discord'
    | 'message'
    | 'slack'
    | 'telegram'
    | 'mattermost'
    | 'webhook'
    | 'flowise'
    | 'openwebui'
    | 'openai',
  data: any
): boolean {
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
      case 'flowise':
        flowiseConfig.load(data);
        flowiseConfig.validate({ allowed: 'strict' });
        break;
      case 'openwebui':
        openWebUIConfig.load(data);
        openWebUIConfig.validate({ allowed: 'strict' });
        break;
      case 'openai':
        openaiConfig.load(data);
        openaiConfig.validate({ allowed: 'strict' });
        break;
    }
    return true;
  } catch (error) {
    throw new Error(`Test data validation failed for ${type}: ${error}`);
  }
}

/**
 * Factory function to create test data for different scenarios
 *
 * @param type The type of test data to generate ('discord', 'message', 'slack', 'telegram', 'mattermost', 'webhook', 'command')
 * @returns The requested test data. For messaging providers, this includes defaults, envVars, and expectedResults.
 *
 * Required fields by provider:
 * - discord: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID
 * - message: MESSAGE_PROVIDER, BOT_ID, NAME, PLATFORM
 * - slack: SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET
 * - telegram: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL, TELEGRAM_PARSE_MODE
 * - mattermost: MATTERMOST_SERVER_URL, MATTERMOST_TOKEN, MATTERMOST_CHANNEL
 * - webhook: WEBHOOK_URL
 */
export function createTestData(
  type:
    | 'discord'
    | 'message'
    | 'slack'
    | 'telegram'
    | 'mattermost'
    | 'webhook'
    | 'flowise'
    | 'openwebui'
    | 'openai'
    | 'command'
): any {
  let data;
  switch (type) {
    case 'discord':
      data = discordConfigData;
      break;
    case 'message':
      data = messageConfigData;
      break;
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
    case 'flowise':
      data = flowiseConfigData;
      break;
    case 'openwebui':
      data = openWebUIConfigData;
      break;
    case 'openai':
      data = openaiConfigData;
      break;
    case 'command':
      return commandParserTestData;
    default:
      throw new Error(`Unknown test data type: ${type}`);
  }

  // Validate the data against the schema
  validateConfigAgainstSchema(
    type as
      | 'discord'
      | 'message'
      | 'slack'
      | 'telegram'
      | 'mattermost'
      | 'webhook'
      | 'flowise'
      | 'openwebui'
      | 'openai',
    data.expectedResults
  );
  return data;
}

/**
 * Property-based test generator for Telegram configuration
 * Generates random, valid Telegram configurations for property-based testing
 */
export const telegramConfigGenerator = fc.record({
  TELEGRAM_BOT_TOKEN: fc.string({ minLength: 10 }),
  TELEGRAM_WEBHOOK_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  TELEGRAM_PARSE_MODE: fc.constantFrom('HTML', 'Markdown', 'None', ''),
  TELEGRAM_ALLOWED_CHATS: fc.array(fc.integer()).map((arr) => arr.join(',')),
  TELEGRAM_BLOCKED_USERS: fc.array(fc.integer()).map((arr) => arr.join(',')),
  TELEGRAM_ENABLE_COMMANDS: fc.boolean(),
});

/**
 * Property-based test generator for Discord configuration
 */
export const discordConfigGenerator = fc.record({
  DISCORD_BOT_TOKEN: fc.string({ minLength: 10 }),
  DISCORD_CLIENT_ID: fc.string({ minLength: 10 }),
  DISCORD_GUILD_ID: fc.string({ minLength: 10 }),
  DISCORD_AUDIO_FILE_PATH: fc.string({ minLength: 3 }),
  DISCORD_WELCOME_MESSAGE: fc.string(),
  DISCORD_CHANNEL_ID: fc.string(),
  DISCORD_DEFAULT_CHANNEL_ID: fc.string(),
  DISCORD_VOICE_CHANNEL_ID: fc.string(),
  DISCORD_PRIORITY_CHANNEL: fc.string(),
  DISCORD_MESSAGE_HISTORY_LIMIT: fc.integer({ min: 1, max: 100 }),
  DISCORD_UNSOLICITED_CHANCE_MODIFIER: fc.float({ min: 0.1, max: 2.0 }),
  DISCORD_MAX_MESSAGE_LENGTH: fc.integer({ min: 100, max: 2000 }),
  DISCORD_INTER_PART_DELAY_MS: fc.integer({ min: 0, max: 5000 }),
  DISCORD_TYPING_DELAY_MAX_MS: fc.integer({ min: 0, max: 10000 }),
  DISCORD_PRIORITY_CHANNEL_BONUS: fc.float({ min: 0.1, max: 2.0 }),
  DISCORD_MESSAGE_PROCESSING_DELAY_MS: fc.integer({ min: 0, max: 10000 }),
  DISCORD_LOGGING_ENABLED: fc.boolean(),
  DISCORD_CHANNEL_BONUSES: fc.dictionary(fc.string(), fc.float()),
});

/**
 * Property-based test generator for Message configuration
 */
export const messageConfigGenerator = fc.record({
  MESSAGE_PROVIDER: fc.constantFrom('discord', 'slack', 'telegram', 'mattermost', 'console'),
  MESSAGE_COMMAND_AUTHORISED_USERS: fc.array(fc.string()).map((arr) => arr.join(',')),
  MESSAGE_FILTER_BY_USER: fc.array(fc.string()).map((arr) => arr.join(',')),
  MESSAGE_USERNAME_OVERRIDE: fc.string(),
  BOT_ID: fc.string({ minLength: 3 }),
  PLATFORM: fc.string(),
  NAME: fc.string(),
  MESSAGE_IGNORE_BOTS: fc.boolean(),
  MESSAGE_ADD_USER_HINT: fc.boolean(),
  MESSAGE_ONLY_WHEN_SPOKEN_TO: fc.boolean(),
  MESSAGE_INTERACTIVE_FOLLOWUPS: fc.boolean(),
  MESSAGE_UNSOLICITED_ADDRESSED: fc.boolean(),
  MESSAGE_UNSOLICITED_UNADDRESSED: fc.boolean(),
  MESSAGE_RESPOND_IN_THREAD: fc.boolean(),
  MESSAGE_COMMAND_INLINE: fc.boolean(),
  MESSAGE_LLM_FOLLOW_UP: fc.boolean(),
  MESSAGE_STRIP_BOT_ID: fc.boolean(),
  DISABLE_DELAYS: fc.boolean(),
  MESSAGE_SEMANTIC_RELEVANCE_ENABLED: fc.boolean(),
  MESSAGE_ALLOW_SELF_MENTION: fc.boolean(),
  MESSAGE_SUPPRESS_DUPLICATES: fc.boolean(),
  MESSAGE_RATE_LIMIT_PER_CHANNEL: fc.integer({ min: 1, max: 100 }),
  MESSAGE_MIN_DELAY: fc.integer({ min: 0, max: 5000 }),
  MESSAGE_MAX_DELAY: fc.integer({ min: 1000, max: 20000 }),
  MESSAGE_ACTIVITY_TIME_WINDOW: fc.integer({ min: 1000, max: 600000 }),
  MESSAGE_THREAD_RELATION_WINDOW: fc.integer({ min: 1000, max: 600000 }),
  MESSAGE_RECENT_ACTIVITY_DECAY_RATE: fc.float({ min: 0.1, max: 1.0 }),
  MESSAGE_INTERROBANG_BONUS: fc.float({ min: 0.1, max: 2.0 }),
  MESSAGE_BOT_RESPONSE_MODIFIER: fc.float({ min: -1.0, max: 1.0 }),
  MESSAGE_MIN_INTERVAL_MS: fc.integer({ min: 0, max: 10000 }),
  MESSAGE_HISTORY_LIMIT: fc.integer({ min: 1, max: 100 }),
  MESSAGE_DELAY_MULTIPLIER: fc.float({ min: 0.1, max: 5.0 }),
  MESSAGE_SEMANTIC_RELEVANCE_BONUS: fc.float({ min: 0.1, max: 20.0 }),
  MESSAGE_WAKEWORDS: fc.array(fc.string()),
  CHANNEL_BONUSES: fc.dictionary(fc.string(), fc.float()),
  CHANNEL_PRIORITIES: fc.dictionary(fc.string(), fc.integer()),
});

/**
 * Property-based test generator for Slack configuration
 */
export const slackConfigGenerator = fc.record({
  SLACK_BOT_TOKEN: fc.string({ minLength: 10 }).map((s) => `xoxb-${s}`),
  SLACK_APP_TOKEN: fc.string({ minLength: 10 }).map((s) => `xapp-${s}`),
  SLACK_SIGNING_SECRET: fc.string({ minLength: 10 }),
  SLACK_JOIN_CHANNELS: fc.array(fc.string({ minLength: 3 })).map((arr) => arr.join(',')),
  SLACK_DEFAULT_CHANNEL_ID: fc.string(),
  WELCOME_RESOURCE_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  REPORT_ISSUE_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  SLACK_MODE: fc.constantFrom('socket', 'rtm', 'events'),
});

/**
 * Property-based test generator for Mattermost configuration
 */
export const mattermostConfigGenerator = fc.record({
  MATTERMOST_SERVER_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  MATTERMOST_TOKEN: fc.string({ minLength: 10 }),
  MATTERMOST_CHANNEL: fc.string(),
});

/**
 * Property-based test generator for Webhook configuration
 */
export const webhookConfigGenerator = fc.record({
  WEBHOOK_ENABLED: fc.boolean(),
  WEBHOOK_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  WEBHOOK_TOKEN: fc.string(),
  WEBHOOK_IP_WHITELIST: fc.array(fc.ipV4()).map((arr) => arr.join(',')),
  WEBHOOK_PORT: fc.integer({ min: 1024, max: 65535 }),
});

/**
 * Property-based test generator for Flowise configuration
 */
export const flowiseConfigGenerator = fc.record({
  FLOWISE_API_ENDPOINT: fc.webUrl().chain((url) => fc.constant(url || '')),
  FLOWISE_API_KEY: fc.string(),
  FLOWISE_CONVERSATION_CHATFLOW_ID: fc.string(),
  FLOWISE_COMPLETION_CHATFLOW_ID: fc.string(),
  FLOWISE_USE_REST: fc.boolean(),
});

/**
 * Property-based test generator for OpenWebUI configuration
 */
export const openWebUIConfigGenerator = fc.record({
  OPEN_WEBUI_API_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  OPEN_WEBUI_USERNAME: fc.string(),
  OPEN_WEBUI_PASSWORD: fc.string(),
  OPEN_WEBUI_KNOWLEDGE_FILE: fc.string(),
  OPEN_WEBUI_MODEL: fc.string(),
});

/**
 * Property-based test generator for OpenAI configuration
 */
export const openaiConfigGenerator = fc.record({
  OPENAI_API_KEY: fc.string({ minLength: 10 }),
  OPENAI_TEMPERATURE: fc.float({ min: Math.fround(0), max: Math.fround(2) }),
  OPENAI_MAX_TOKENS: fc.integer({ min: 1, max: 8000 }),
  OPENAI_FREQUENCY_PENALTY: fc.float({ min: Math.fround(-2), max: Math.fround(2) }),
  OPENAI_PRESENCE_PENALTY: fc.float({ min: Math.fround(-2), max: Math.fround(2) }),
  OPENAI_BASE_URL: fc.webUrl().chain((url) => fc.constant(url || '')),
  OPENAI_TIMEOUT: fc.integer({ min: 1000, max: 60000 }),
  OPENAI_ORGANIZATION: fc.string(),
  OPENAI_MODEL: fc.string(),
  OPENAI_STOP: fc.array(fc.string()),
  OPENAI_TOP_P: fc.float({ min: Math.fround(0), max: Math.fround(1) }),
  OPENAI_SYSTEM_PROMPT: fc.string(),
  OPENAI_RESPONSE_MAX_TOKENS: fc.integer({ min: 1, max: 8000 }),
  OPENAI_MAX_RETRIES: fc.integer({ min: 0, max: 10 }),
  OPENAI_FINISH_REASON_RETRY: fc.string(),
  OPENAI_VOICE: fc.string(),
  OPENAI_EMBEDDING_MODELS: fc.array(fc.string()),
});

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
