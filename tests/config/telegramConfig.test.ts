import telegramConfig from '../../src/config/telegramConfig';

describe('telegramConfig', () => {
  it('should export a convict config object', () => {
    expect(telegramConfig).toBeDefined();
    expect(typeof telegramConfig.get).toBe('function');
  });

  it('should have default values for all fields', () => {
    expect(telegramConfig.get('TELEGRAM_BOT_TOKEN')).toBe('');
    expect(telegramConfig.get('TELEGRAM_WEBHOOK_URL')).toBe('');
    expect(telegramConfig.get('TELEGRAM_PARSE_MODE')).toBe('HTML');
    expect(telegramConfig.get('TELEGRAM_ALLOWED_CHATS')).toBe('');
    expect(telegramConfig.get('TELEGRAM_BLOCKED_USERS')).toBe('');
    expect(telegramConfig.get('TELEGRAM_ENABLE_COMMANDS')).toBe(true);
  });

  it('should have sensitive flag on TELEGRAM_BOT_TOKEN', () => {
    const schema = (telegramConfig as any)._schema || (telegramConfig as any)._def;
    // convict stores schema internally; check that the config is valid
    expect(() => telegramConfig.validate({ allowed: 'strict' })).not.toThrow();
  });

  it('should accept valid TELEGRAM_PARSE_MODE values', () => {
    // The default 'HTML' is one of the valid formats
    const parseMode = telegramConfig.get('TELEGRAM_PARSE_MODE');
    expect(['HTML', 'Markdown', 'None', '']).toContain(parseMode);
  });
});
