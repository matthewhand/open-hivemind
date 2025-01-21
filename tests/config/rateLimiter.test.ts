import rateLimiter from '../../src/config/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Reset the rateLimiter's state before each test
    rateLimiter['messagesLastHour'] = [];
    rateLimiter['messagesLastDay'] = [];
    process.env.LLM_MESSAGE_LIMIT_PER_HOUR = '60';
    process.env.LLM_MESSAGE_LIMIT_PER_DAY = '1000';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('canSendMessage returns true when under limits', () => {
    expect(rateLimiter.canSendMessage()).toBe(true);
  });

  test('canSendMessage returns false when hourly limit is exceeded', () => {
    process.env.LLM_MESSAGE_LIMIT_PER_HOUR = '2';
    rateLimiter.addMessageTimestamp();
    rateLimiter.addMessageTimestamp();
    expect(rateLimiter.canSendMessage()).toBe(false);
  });

  test('canSendMessage returns false when daily limit is exceeded', () => {
    process.env.LLM_MESSAGE_LIMIT_PER_DAY = '2';
    rateLimiter.addMessageTimestamp();
    rateLimiter.addMessageTimestamp();
    expect(rateLimiter.canSendMessage()).toBe(false);
  });

  test('addMessageTimestamp adds timestamps correctly', () => {
    rateLimiter.addMessageTimestamp();
    expect(rateLimiter['messagesLastHour'].length).toBe(1);
    expect(rateLimiter['messagesLastDay'].length).toBe(1);
  });

  test('addMessageTimestamp filters out messages older than one hour', () => {
    const now = new Date();
    jest.setSystemTime(now);
    rateLimiter.addMessageTimestamp();

    // Advance time by 2 hours
    jest.setSystemTime(new Date(now.getTime() + 2 * 3600000));
    rateLimiter.addMessageTimestamp();

    expect(rateLimiter['messagesLastHour'].length).toBe(1);
    expect(rateLimiter['messagesLastDay'].length).toBe(2);
  });

  test('addMessageTimestamp filters out messages older than one day', () => {
    const now = new Date();
    jest.setSystemTime(now);
    rateLimiter.addMessageTimestamp();

    // Advance time by 25 hours
    jest.setSystemTime(new Date(now.getTime() + 25 * 3600000));
    rateLimiter.addMessageTimestamp();

    expect(rateLimiter['messagesLastHour'].length).toBe(1);
    expect(rateLimiter['messagesLastDay'].length).toBe(1);
  });
});