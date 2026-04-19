import messageConfig from '@config/messageConfig';
import { stripBotId } from '@message/helpers/processing/stripBotId';

// Mock the messageConfig dependency
jest.mock('@config/messageConfig', () => ({
  get: jest.fn(),
}));

const mockedMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;

describe('stripBotId Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedMessageConfig.get as jest.Mock).mockReturnValue(true);
  });

  it('should treat botId as literal text even if it contains regex special characters', () => {
    // botId containing a pipe (OR operator in regex)
    const maliciousBotId = 'U123|U456';
    const message = 'Hello <@U123>, <@U456>, and <@U123|U456>!';

    // If NOT escaped, <@U123|U456> matches "<@U123" OR "U456>"
    // Result would be: "Hello , <@U456>, and |!" (incorrectly stripped parts of other mentions)

    // If ESCAPED, it should only match the exact sequence <@U123|U456>
    // Result should be: "Hello <@U123>, <@U456>, and !"

    const result = stripBotId(message, maliciousBotId);
    expect(result).toBe('Hello <@U123>, <@U456>, and !');
  });

  it('should not over-match when botId contains dots', () => {
    const botIdWithDot = 'U.123';
    const message = 'Hello <@UA123> and <@U.123>';

    // If NOT escaped, <@U.123> matches "<@UA123>"
    // If ESCAPED, it only matches "<@U.123>"

    const result = stripBotId(message, botIdWithDot);
    expect(result).toBe('Hello <@UA123> and ');
  });
});
