jest.mock('@message/interfaces/messageConfig', () => ({
  get: jest.fn()
}));

const addHintModule = require('@message/helpers/processing/addUserHint');
const addHintMsgConfig = require('@message/interfaces/messageConfig');

describe('addUserHint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add user hint when MESSAGE_ADD_USER_HINT is true', () => {
    addHintMsgConfig.get.mockReturnValue(true);
    const result = addHintModule.addUserHint('<@bot123> hello', 'user456', 'bot123');
    expect(result).toBe('(from <@user456>) hello');
  });

  it('should not add user hint when MESSAGE_ADD_USER_HINT is false', () => {
    addHintMsgConfig.get.mockReturnValue(false);
    const result = addHintModule.addUserHint('<@bot123> hello', 'user456', 'bot123');
    expect(result).toBe('<@bot123> hello');
  });

  it('should handle multiple bot mentions', () => {
    addHintMsgConfig.get.mockReturnValue(true);
    const result = addHintModule.addUserHint('<@bot123> hi <@bot123>', 'user456', 'bot123');
    expect(result).toBe('(from <@user456>) hi (from <@user456>)');
  });

  it('should return original message if botId not found', () => {
    addHintMsgConfig.get.mockReturnValue(true);
    const result = addHintModule.addUserHint('hello', 'user456', 'bot123');
    expect(result).toBe('hello');
  });
});
