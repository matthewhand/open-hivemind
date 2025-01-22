import { shouldReplyToUnsolicitedMessage } from '../../../src/message/helpers/unsolicitedMessageHandler';
import { ConfigurationManager } from '@config/ConfigurationManager';

jest.mock('@config/ConfigurationManager', () => ({
  ConfigurationManager: {
    getInstance: jest.fn(),
  },
}));

const mockConfigManagerInstance = {
  getSession: jest.fn(),
  setSession: jest.fn(),
};

(ConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockConfigManagerInstance);

describe('shouldReplyToUnsolicitedMessage', () => {
  let msg: any;
  const botId = 'bot123';
  const integration = 'discord';

  beforeEach(() => {
    msg = {
      getChannelId: jest.fn(),
      isMentioning: jest.fn(),
      isReply: jest.fn(),
    };
    mockConfigManagerInstance.getSession.mockClear();
    mockConfigManagerInstance.setSession.mockClear();
  });

  it('should return false if bot has never spoken and it is not a direct query', () => {
    const channelId = 'channel1';
    msg.getChannelId.mockReturnValue(channelId);
    mockConfigManagerInstance.getSession.mockReturnValue(false);
    msg.isMentioning.mockReturnValue(false);
    msg.isReply.mockReturnValue(false);

    const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
    expect(result).toBe(false);
  });

  it('should return true if bot has never spoken but it is a direct query', () => {
    const channelId = 'channel2';
    msg.getChannelId.mockReturnValue(channelId);
    mockConfigManagerInstance.getSession.mockReturnValue(false);
    msg.isMentioning.mockReturnValue(true);
    msg.isReply.mockReturnValue(false);

    const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
    expect(result).toBe(true);
    expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
  });
});