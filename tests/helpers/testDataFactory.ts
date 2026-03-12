import fc from 'fast-check';
import discordConfig from '../../src/config/discordConfig';
import mattermostConfig from '../../src/config/mattermostConfig';
import messageConfig from '../../src/config/messageConfig';
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
    MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL: false,
    MESSAGE_DUPLICATE_WINDOW_MS: 300000,
    MESSAGE_DUPLICATE_HISTORY_SIZE: 10,
    MESSAGE_READING_DELAY_BASE_MS: 200,
    MESSAGE_READING_DELAY_PER_CHAR_MS: 15,
    MESSAGE_READING_DELAY_MIN_MS: 500,
    MESSAGE_READING_DELAY_MAX_MS: 2000,
    MESSAGE_COMPOUNDING_DELAY_BASE_MS: 1500,
    MESSAGE_SHORT_LENGTH_PENALTY: 0.1,
    MESSAGE_COMPOUNDING_DELAY_MAX_MS: 15000,
    MESSAGE_RESPONSE_PROFILES: '{"default":{},"eager":{"MESSAGE_DELAY_MULTIPLIER":1.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.05,"MESSAGE_ONLY_WHEN_SPOKEN_TO":false},"cautious":{"MESSAGE_DELAY_MULTIPLIER":3.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.005,"MESSAGE_ONLY_WHEN_SPOKEN_TO":true}}',
    MESSAGE_UNSOLICITED_BASE_CHANCE: 0.01,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS: 300000,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE: 2,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR: 0.25,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR: 3,
    MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST: 0.4,
    MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY: 3,
    MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD: 0.6,
    MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ: 3,
    MESSAGE_OTHERS_TYPING_WINDOW_MS: 8000,
    MESSAGE_OTHERS_TYPING_MAX_WAIT_MS: 5000,
    MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: 300000,
    MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION: true,
    MESSAGE_MAX_GENERATION_RETRIES: 3,
    MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: false,
    MESSAGE_FOLLOW_UP_ENABLED: true,
    MESSAGE_LLM_CHAT: true,
    MESSAGE_LLM_COMPLETE_SENTENCE: true,
    MESSAGE_LLM_SUMMARISE: false,
    MESSAGE_COMMAND_SLASH: true,
    MESSAGE_WEBHOOK_ENABLED: true,
    MESSAGE_MENTION_BONUS: 0.1,
    MESSAGE_HISTORY_ADAPTIVE_ENABLED: true,
    MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT: 6,
    MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT: 60,
    MESSAGE_HISTORY_ADAPTIVE_STEP: 5,
    MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION: 0.75,
    MESSAGE_LLM_CONTEXT_WINDOW_TOKENS: 8000,
    MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS: 400,
    MESSAGE_DECAY_RATE: 0.001,
    MESSAGE_CALM_WINDOW: 300000,
    MESSAGE_CHANNEL_ROUTER_ENABLED: false,
    greeting: '{"disabled":false,"message":"Hello! I am online.","use_llm":true}',
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
    MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL: 'true',
    MESSAGE_DUPLICATE_WINDOW_MS: '300001',
    MESSAGE_DUPLICATE_HISTORY_SIZE: '11',
    MESSAGE_READING_DELAY_BASE_MS: '201',
    MESSAGE_READING_DELAY_PER_CHAR_MS: '16',
    MESSAGE_READING_DELAY_MIN_MS: '501',
    MESSAGE_READING_DELAY_MAX_MS: '2001',
    MESSAGE_COMPOUNDING_DELAY_BASE_MS: '1501',
    MESSAGE_SHORT_LENGTH_PENALTY: '1.1',
    MESSAGE_COMPOUNDING_DELAY_MAX_MS: '15001',
    MESSAGE_RESPONSE_PROFILES: '{"default":{},"eager":{"MESSAGE_DELAY_MULTIPLIER":1.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.05,"MESSAGE_ONLY_WHEN_SPOKEN_TO":false},"cautious":{"MESSAGE_DELAY_MULTIPLIER":3.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.005,"MESSAGE_ONLY_WHEN_SPOKEN_TO":true}}',
    MESSAGE_UNSOLICITED_BASE_CHANCE: '1.01',
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS: '300001',
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE: '3',
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR: '1.25',
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR: '4',
    MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST: '1.4',
    MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY: '4',
    MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD: '1.6',
    MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ: '4',
    MESSAGE_OTHERS_TYPING_WINDOW_MS: '8001',
    MESSAGE_OTHERS_TYPING_MAX_WAIT_MS: '5001',
    MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: '300001',
    MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION: 'false',
    MESSAGE_MAX_GENERATION_RETRIES: '4',
    MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: 'true',
    MESSAGE_FOLLOW_UP_ENABLED: 'false',
    MESSAGE_LLM_CHAT: 'false',
    MESSAGE_LLM_COMPLETE_SENTENCE: 'false',
    MESSAGE_LLM_SUMMARISE: 'true',
    MESSAGE_COMMAND_SLASH: 'false',
    MESSAGE_WEBHOOK_ENABLED: 'false',
    MESSAGE_MENTION_BONUS: '1.1',
    MESSAGE_HISTORY_ADAPTIVE_ENABLED: 'false',
    MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT: '7',
    MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT: '61',
    MESSAGE_HISTORY_ADAPTIVE_STEP: '6',
    MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION: '1.75',
    MESSAGE_LLM_CONTEXT_WINDOW_TOKENS: '8001',
    MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS: '401',
    MESSAGE_DECAY_RATE: '1.001',
    MESSAGE_CALM_WINDOW: '300001',
    MESSAGE_CHANNEL_ROUTER_ENABLED: 'true',
    greeting: '{"disabled":false,"message":"Hello! I am online.","use_llm":true}',
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
    MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL: true,
    MESSAGE_DUPLICATE_WINDOW_MS: 300001,
    MESSAGE_DUPLICATE_HISTORY_SIZE: 11,
    MESSAGE_READING_DELAY_BASE_MS: 201,
    MESSAGE_READING_DELAY_PER_CHAR_MS: 16,
    MESSAGE_READING_DELAY_MIN_MS: 501,
    MESSAGE_READING_DELAY_MAX_MS: 2001,
    MESSAGE_COMPOUNDING_DELAY_BASE_MS: 1501,
    MESSAGE_SHORT_LENGTH_PENALTY: 1.1,
    MESSAGE_COMPOUNDING_DELAY_MAX_MS: 15001,
    MESSAGE_RESPONSE_PROFILES: '{"default":{},"eager":{"MESSAGE_DELAY_MULTIPLIER":1.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.05,"MESSAGE_ONLY_WHEN_SPOKEN_TO":false},"cautious":{"MESSAGE_DELAY_MULTIPLIER":3.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.005,"MESSAGE_ONLY_WHEN_SPOKEN_TO":true}}',
    MESSAGE_UNSOLICITED_BASE_CHANCE: 1.01,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS: 300001,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE: 3,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR: 1.25,
    MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR: 4,
    MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST: 1.4,
    MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY: 4,
    MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD: 1.6,
    MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ: 4,
    MESSAGE_OTHERS_TYPING_WINDOW_MS: 8001,
    MESSAGE_OTHERS_TYPING_MAX_WAIT_MS: 5001,
    MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: 300001,
    MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION: false,
    MESSAGE_MAX_GENERATION_RETRIES: 4,
    MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: true,
    MESSAGE_FOLLOW_UP_ENABLED: false,
    MESSAGE_LLM_CHAT: false,
    MESSAGE_LLM_COMPLETE_SENTENCE: false,
    MESSAGE_LLM_SUMMARISE: true,
    MESSAGE_COMMAND_SLASH: false,
    MESSAGE_WEBHOOK_ENABLED: false,
    MESSAGE_MENTION_BONUS: 1.1,
    MESSAGE_HISTORY_ADAPTIVE_ENABLED: false,
    MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT: 7,
    MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT: 61,
    MESSAGE_HISTORY_ADAPTIVE_STEP: 6,
    MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION: 1.75,
    MESSAGE_LLM_CONTEXT_WINDOW_TOKENS: 8001,
    MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS: 401,
    MESSAGE_DECAY_RATE: 1.001,
    MESSAGE_CALM_WINDOW: 300001,
    MESSAGE_CHANNEL_ROUTER_ENABLED: true,
    greeting: '{"disabled":false,"message":"Hello! I am online.","use_llm":true}',
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
    SLACK_BOT_JOIN_CHANNEL_MESSAGE:
      "# Bot joined the {channel} channel! :robot_face:\n\nWelcome! I'm here to assist. [Get Started](action:start_{channel})",
    SLACK_USER_JOIN_CHANNEL_MESSAGE:
      '# Welcome, {user}, to the {channel} channel! :wave:\n\nHere’s some quick info:\n- *Purpose*: Support student inquiries related to learning objectives...\n- *Resources*: [Learn More](https://university.example.com/resources)\n\n## Actions\n- [Learning Objectives](action:learn_objectives_{channel})\n- [How-To](action:how_to_{channel})\n- [Contact Support](action:contact_support_{channel})\n- [Report Issue](action:report_issue_{channel})',
    SLACK_BOT_LEARN_MORE_MESSAGE: 'Here’s more info about channel {channel}!',
    SLACK_BUTTON_MAPPINGS:
      '{"learn_objectives_C08BC0X4DFD": "Learning Objectives", "how_to_C08BC0X4DFD": "How-To", "contact_support_C08BC0X4DFD": "Contact Support", "report_issue_C08BC0X4DFD": "Report Issue", "start_C08BC0X4DFD": "Get Started"}',
  },
  envVars: {
    SLACK_BOT_TOKEN: 'xoxb-test-token-123',
    SLACK_APP_TOKEN: 'xapp-test-app-token-456',
    SLACK_SIGNING_SECRET: 'test-signing-secret-789',
    SLACK_JOIN_CHANNELS: 'C1234567890,C0987654321',
    SLACK_DEFAULT_CHANNEL_ID: 'C1234567890',
    SLACK_MODE: 'rtm',
    SLACK_BOT_JOIN_CHANNEL_MESSAGE: 'Test bot join',
    SLACK_USER_JOIN_CHANNEL_MESSAGE: 'Test user join',
    SLACK_BOT_LEARN_MORE_MESSAGE: 'Test learn more',
    SLACK_BUTTON_MAPPINGS: '{"test_action": "Test Action"}',
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
    SLACK_BOT_JOIN_CHANNEL_MESSAGE: 'Test bot join',
    SLACK_USER_JOIN_CHANNEL_MESSAGE: 'Test user join',
    SLACK_BOT_LEARN_MORE_MESSAGE: 'Test learn more',
    SLACK_BUTTON_MAPPINGS: '{"test_action": "Test Action"}',
    WELCOME_RESOURCE_URL: 'https://custom.example.com/welcome',
    REPORT_ISSUE_URL: 'https://custom.example.com/report',
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
  type: 'discord' | 'message' | 'slack' | 'telegram' | 'mattermost' | 'webhook',
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
  type: 'discord' | 'message' | 'slack' | 'telegram' | 'mattermost' | 'webhook' | 'command'
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
    case 'command':
      return commandParserTestData;
    default:
      throw new Error(`Unknown test data type: ${type}`);
  }

  // Validate the data against the schema
  validateConfigAgainstSchema(
    type as 'discord' | 'message' | 'slack' | 'telegram' | 'mattermost' | 'webhook',
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
  MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL: fc.boolean(),
  MESSAGE_DUPLICATE_WINDOW_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_DUPLICATE_HISTORY_SIZE: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_READING_DELAY_BASE_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_READING_DELAY_PER_CHAR_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_READING_DELAY_MIN_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_READING_DELAY_MAX_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_COMPOUNDING_DELAY_BASE_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_SHORT_LENGTH_PENALTY: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_COMPOUNDING_DELAY_MAX_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_RESPONSE_PROFILES: fc.constant('{"default":{},"eager":{"MESSAGE_DELAY_MULTIPLIER":1.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.05,"MESSAGE_ONLY_WHEN_SPOKEN_TO":false},"cautious":{"MESSAGE_DELAY_MULTIPLIER":3.5,"MESSAGE_UNSOLICITED_BASE_CHANCE":0.005,"MESSAGE_ONLY_WHEN_SPOKEN_TO":true}}'),
  MESSAGE_UNSOLICITED_BASE_CHANCE: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_TEMPERATURE_REPETITION_MAX_BOOST: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_TEMPERATURE_REPETITION_MIN_HISTORY: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_TEMPERATURE_REPETITION_RATIO_THRESHOLD: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_TEMPERATURE_REPETITION_MIN_DOC_FREQ: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_OTHERS_TYPING_WINDOW_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_OTHERS_TYPING_MAX_WAIT_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_SEND_ANYWAY_ON_BAD_GENERATION: fc.boolean(),
  MESSAGE_MAX_GENERATION_RETRIES: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: fc.boolean(),
  MESSAGE_FOLLOW_UP_ENABLED: fc.boolean(),
  MESSAGE_LLM_CHAT: fc.boolean(),
  MESSAGE_LLM_COMPLETE_SENTENCE: fc.boolean(),
  MESSAGE_LLM_SUMMARISE: fc.boolean(),
  MESSAGE_COMMAND_SLASH: fc.boolean(),
  MESSAGE_WEBHOOK_ENABLED: fc.boolean(),
  MESSAGE_MENTION_BONUS: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_HISTORY_ADAPTIVE_ENABLED: fc.boolean(),
  MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_HISTORY_ADAPTIVE_STEP: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_LLM_CONTEXT_WINDOW_TOKENS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_LLM_CONTEXT_SAFETY_MARGIN_TOKENS: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_DECAY_RATE: fc.float({ min: Math.fround(0.0), max: Math.fround(10.0) }),
  MESSAGE_CALM_WINDOW: fc.integer({ min: 0, max: 1000 }),
  MESSAGE_CHANNEL_ROUTER_ENABLED: fc.boolean(),
  greeting: fc.constant('{"disabled":false,"message":"Hello! I am online.","use_llm":true}'),
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
  SLACK_BOT_JOIN_CHANNEL_MESSAGE: fc.string(),
  SLACK_USER_JOIN_CHANNEL_MESSAGE: fc.string(),
  SLACK_BOT_LEARN_MORE_MESSAGE: fc.string(),
  SLACK_BUTTON_MAPPINGS: fc.constant('{"action_1": "Message 1"}'),
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

/**
 * Factory for creating mock bot instances in tests
 */
export function createMockBot(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: `bot-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Bot',
    status: 'inactive',
    messageProviders: [],
    llmProviders: [],
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Factory for creating mock provider instances in tests
 */
export function createMockProvider(type: 'discord' | 'slack' | 'openai' | 'flowise' = 'discord', overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: `provider-${Math.random().toString(36).slice(2, 9)}`,
    type,
    name: `Test ${type} Provider`,
    config: {},
    enabled: true,
    ...overrides,
  };
}

/**
 * Factory for creating mock IMessage instances in tests
 */
export function createMockMessage(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    getMessageId: () => `msg-${Math.random().toString(36).slice(2, 9)}`,
    getText: () => 'test message',
    getChannelId: () => 'channel-123',
    getAuthorId: () => 'user-456',
    isFromBot: () => false,
    mentionsBot: () => false,
    getTimestamp: () => new Date(),
    ...overrides,
  };
}
