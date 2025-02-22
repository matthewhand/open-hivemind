const addHintModule = require('@src/message/helpers/processing/addUserHint');
const addHintMsgConfig = require('@config/messageConfig');

jest.mock('@config/messageConfig', () => ({
  get: jest.fn()
}));

describe('addUserHint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add user hint when MESSAGE_ADD_USER_HINT is true', () => {
    addHintMsgConfig.get.mockReturnValue(true);
    const result = addHintModule.addUserHintFn('<@bot123> hello', 'user456', 'bot123');
    expect(result).toBe('(from <@user456>) hello');
  });

  it('should not add user hint when MESSAGE_ADD_USER_HINT is false', () => {
    addHintMsgConfig.get.mockReturnValue(false);
    const result = addHintModule.addUserHintFn('<@bot123> hello', 'user456', 'bot123');
    expect(result).toBe('<@bot123> hello');
  });

  it('should handle multiple bot mentions', () => {
    addHintMsgConfig.get.mockReturnValue(true);
    const result = addHintModule.addUserHintFn('<@bot123> hi <@bot123>', 'user456', 'bot123');
    expect(result).toBe('(from <@user456>) hi (from <@user456>)');
  });

  it('should return original message if botId not found', () => {
    addHintMsgConfig.get.mockReturnValue(true);
    const result = addHintModule.addUserHintFn('hello', 'user456', 'bot123');
    expect(result).toBe('hello');
  });
});
