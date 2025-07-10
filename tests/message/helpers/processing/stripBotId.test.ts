import { stripBotId } from '@message/helpers/processing/stripBotId';
import messageConfig from '@config/messageConfig';

// Mock the messageConfig dependency
jest.mock('@config/messageConfig', () => ({
  get: jest.fn(),
}));

const mockedMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;

describe('stripBotId', () => {
  const botId = 'U123ABC456';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should strip a single bot ID mention when config is enabled', () => {
    // Enable stripping
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(true);

    const message = `Hello <@${botId}>, how are you?`;
    const expected = 'Hello , how are you?';
    const result = stripBotId(message, botId);
    expect(result).toBe(expected);
  });

  it('should strip multiple bot ID mentions when config is enabled', () => {
    // Enable stripping
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(true);

    const message = `<@${botId}>, can you help me, <@${botId}>?`;
    const expected = ', can you help me, ?';
    const result = stripBotId(message, botId);
    expect(result).toBe(expected);
  });

  it('should not strip the bot ID mention when config is disabled', () => {
    // Disable stripping
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(false);

    const message = `Hello <@${botId}>, how are you?`;
    const result = stripBotId(message, botId);
    expect(result).toBe(message);
  });

  it('should return the original message if it contains no bot ID mentions', () => {
    // Enable stripping
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(true);

    const message = 'This is a message without any mentions.';
    const result = stripBotId(message, botId);
    expect(result).toBe(message);
  });

  it('should handle an empty message string gracefully', () => {
    // Enable stripping
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(true);

    const message = '';
    const result = stripBotId(message, botId);
    expect(result).toBe('');
  });

  it('should not strip a different bot ID', () => {
    // Enable stripping
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(true);

    const otherBotId = 'U654CBA321';
    const message = `Hello <@${otherBotId}>, this is a test.`;
    const result = stripBotId(message, botId);
    expect(result).toBe(message);
  });
});
