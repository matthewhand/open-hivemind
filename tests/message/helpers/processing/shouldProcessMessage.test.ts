jest.mock('@config/messageConfig', () => ({
  get: jest.fn()
}));

const shouldProcessModule = require('@message/helpers/processing/shouldProcessMessage');
const msgConfigMock = require('@config/messageConfig');

describe('getMinIntervalMs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return MESSAGE_MIN_INTERVAL_MS when set', () => {
    msgConfigMock.get.mockReturnValue(2000);
    expect(shouldProcessModule.getMinIntervalMs()).toBe(2000);
  });

  it('should return 1000 as default when MESSAGE_MIN_INTERVAL_MS is not set', () => {
    msgConfigMock.get.mockReturnValue(undefined);
    expect(shouldProcessModule.getMinIntervalMs()).toBe(1000);
  });
});
