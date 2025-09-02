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

  describe('Bot has never spoken scenarios', () => {
    beforeEach(() => {
      mockConfigManagerInstance.getSession.mockReturnValue(false);
    });

    it('should return false if bot has never spoken and it is not a direct query', () => {
      const channelId = 'channel1';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(false);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(false);
      expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
    });

    it('should return true if bot has never spoken but it is a direct mention', () => {
      const channelId = 'channel2';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(true);
      expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
    });

    it('should return true if bot has never spoken but it is a reply to bot', () => {
      const channelId = 'channel3';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(true);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(true);
      expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
    });

    it('should return true if bot has never spoken but it is both mention and reply', () => {
      const channelId = 'channel4';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(true);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(true);
      expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
    });
  });

  describe('Bot has spoken before scenarios', () => {
    beforeEach(() => {
      mockConfigManagerInstance.getSession.mockReturnValue(true);
    });

    it('should return true if bot has spoken before regardless of mention status', () => {
      const channelId = 'active_channel1';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(false);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(true);
      expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
    });

    it('should return true if bot has spoken before with mention', () => {
      const channelId = 'active_channel2';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(true);
      expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
    });

    it('should return true if bot has spoken before with reply', () => {
      const channelId = 'active_channel3';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(true);

      const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
      expect(result).toBe(true);
      expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
    });
  });

  describe('Different integrations', () => {
    const integrations = ['discord', 'slack', 'mattermost', 'telegram'];

    integrations.forEach(testIntegration => {
      it(`should work correctly with ${testIntegration} integration`, () => {
        const channelId = `${testIntegration}_channel`;
        msg.getChannelId.mockReturnValue(channelId);
        msg.isMentioning.mockReturnValue(true);
        msg.isReply.mockReturnValue(false);
        mockConfigManagerInstance.getSession.mockReturnValue(false);

        const result = shouldReplyToUnsolicitedMessage(msg, botId, testIntegration);
        expect(result).toBe(true);
        expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(testIntegration, channelId, 'active');
      });
    });
  });

  describe('Different bot IDs', () => {
    it('should work with different bot ID formats', () => {
      const botIds = ['bot123', 'BOT_456', 'bot-with-dashes', 'bot_with_underscores', '1234567890'];
      const channelId = 'test_channel';

      botIds.forEach(testBotId => {
        msg.getChannelId.mockReturnValue(channelId);
        msg.isMentioning.mockReturnValue(true);
        msg.isReply.mockReturnValue(false);
        mockConfigManagerInstance.getSession.mockReturnValue(false);
        mockConfigManagerInstance.setSession.mockClear();

        const result = shouldReplyToUnsolicitedMessage(msg, testBotId, integration);
        expect(result).toBe(true);
        expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
      });
    });
  });

  describe('Channel ID variations', () => {
    it('should handle different channel ID formats', () => {
      const channelIds = ['C1234567890', 'channel_123', 'general', 'team-chat', 'very-long-channel-name-with-many-characters'];

      channelIds.forEach(channelId => {
        msg.getChannelId.mockReturnValue(channelId);
        msg.isMentioning.mockReturnValue(true);
        msg.isReply.mockReturnValue(false);
        mockConfigManagerInstance.getSession.mockReturnValue(false);
        mockConfigManagerInstance.setSession.mockClear();

        const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);
        expect(result).toBe(true);
        expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
      });
    });

    it('should handle empty or null channel IDs gracefully', () => {
      const invalidChannelIds = ['', null, undefined];

      invalidChannelIds.forEach(channelId => {
        msg.getChannelId.mockReturnValue(channelId);
        msg.isMentioning.mockReturnValue(true);
        msg.isReply.mockReturnValue(false);
        mockConfigManagerInstance.getSession.mockReturnValue(false);
        mockConfigManagerInstance.setSession.mockClear();

        expect(() => {
          shouldReplyToUnsolicitedMessage(msg, botId, integration);
        }).not.toThrow();
      });
    });
  });

  describe('Configuration Manager interactions', () => {
    it('should call getSession with correct parameters', () => {
      const channelId = 'test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(false);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      shouldReplyToUnsolicitedMessage(msg, botId, integration);

      expect(mockConfigManagerInstance.getSession).toHaveBeenCalledWith(integration, channelId);
    });

    it('should handle getSession returning different values', () => {
      const channelId = 'test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(false);

      // Test different return values from getSession
      const sessionValues = [true, false, null, undefined, 'active', 'inactive', 0, 1];

      sessionValues.forEach(sessionValue => {
        mockConfigManagerInstance.getSession.mockReturnValue(sessionValue);
        mockConfigManagerInstance.setSession.mockClear();

        const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);

        if (sessionValue) {
          expect(result).toBe(true);
          expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
        } else {
          expect(result).toBe(false);
          expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
        }
      });
    });

    it('should handle ConfigurationManager errors gracefully', () => {
      const channelId = 'test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);

      mockConfigManagerInstance.getSession.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      expect(() => {
        shouldReplyToUnsolicitedMessage(msg, botId, integration);
      }).toThrow('Configuration error');
    });

    it('should handle setSession errors gracefully', () => {
      const channelId = 'test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      mockConfigManagerInstance.setSession.mockImplementation(() => {
        throw new Error('Set session error');
      });

      expect(() => {
        shouldReplyToUnsolicitedMessage(msg, botId, integration);
      }).toThrow('Set session error');
    });
  });

  describe('Message object method interactions', () => {
    it('should handle message methods returning different types', () => {
      const channelId = 'test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      // Test different return types for isMentioning
      const mentionValues = [true, false, null, undefined, 'true', 'false', 1, 0];
      
      mentionValues.forEach(mentionValue => {
        msg.isMentioning.mockReturnValue(mentionValue);
        msg.isReply.mockReturnValue(false);
        mockConfigManagerInstance.setSession.mockClear();

        const result = shouldReplyToUnsolicitedMessage(msg, botId, integration);

        if (mentionValue) {
          expect(result).toBe(true);
          expect(mockConfigManagerInstance.setSession).toHaveBeenCalledWith(integration, channelId, 'active');
        } else {
          expect(result).toBe(false);
          expect(mockConfigManagerInstance.setSession).not.toHaveBeenCalled();
        }
      });
    });

    it('should handle message method errors gracefully', () => {
      msg.getChannelId.mockImplementation(() => {
        throw new Error('Channel ID error');
      });

      expect(() => {
        shouldReplyToUnsolicitedMessage(msg, botId, integration);
      }).toThrow('Channel ID error');
    });

    it('should call all required message methods', () => {
      const channelId = 'test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(false);
      msg.isReply.mockReturnValue(false);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      shouldReplyToUnsolicitedMessage(msg, botId, integration);

      expect(msg.getChannelId).toHaveBeenCalled();
      expect(msg.isMentioning).toHaveBeenCalledWith(botId);
      expect(msg.isReply).toHaveBeenCalledWith(botId);
    });
  });

  describe('Performance and reliability', () => {
    it('should handle many rapid calls efficiently', () => {
      const channelId = 'performance_test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        shouldReplyToUnsolicitedMessage(msg, botId, integration);
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete 1000 calls in under 1 second
    });

    it('should maintain consistent behavior across multiple calls', () => {
      const channelId = 'consistency_test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(shouldReplyToUnsolicitedMessage(msg, botId, integration));
      }

      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });

    it('should handle concurrent calls correctly', async () => {
      const channelId = 'concurrent_test_channel';
      msg.getChannelId.mockReturnValue(channelId);
      msg.isMentioning.mockReturnValue(true);
      msg.isReply.mockReturnValue(false);
      mockConfigManagerInstance.getSession.mockReturnValue(false);

      const promises = Array(50).fill(null).map(() => 
        Promise.resolve(shouldReplyToUnsolicitedMessage(msg, botId, integration))
      );

      const results = await Promise.all(promises);

      // All results should be identical
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});