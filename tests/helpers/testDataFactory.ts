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
    DISCORD_AUDIO_DIR: './data/audio',
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
 * Factory function to create test data for different scenarios
 */
export function createTestData(type: 'discord' | 'message' | 'slack' | 'command'): any {
  switch (type) {
    case 'discord':
      return discordConfigData;
    case 'message':
      return messageConfigData;
    case 'slack':
      return slackConfigData;
    case 'command':
      return commandParserTestData;
    default:
      throw new Error(`Unknown test data type: ${type}`);
  }
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
