import { ChannelDelayManager } from '@message/helpers/handler/ChannelDelayManager';

describe('ChannelDelayManager', () => {
  let delayManager: ChannelDelayManager;
  const channelId = 'test-channel';
  const botId = 'test-bot';
  const key = `${channelId}:${botId}`;
  const baseDelayMs = 1000;
  const maxDelayMs = 3000;

  beforeEach(() => {
    delayManager = ChannelDelayManager.getInstance();
    delayManager.clear(key); // Reset state before each test
  });

  afterEach(() => {
    delayManager.clear(key); // Clean up after each test
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = ChannelDelayManager.getInstance();
      const instance2 = ChannelDelayManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getKey', () => {
    it('should return a composite key', () => {
      const result = delayManager.getKey(channelId, botId);
      expect(result).toBe(key);
    });
  });

  describe('registerMessage', () => {
    it('should assign the first message as leader', () => {
      const result = delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      expect(result.isLeader).toBe(true);
    });

    it('should not assign subsequent messages as leader', () => {
      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      const result = delayManager.registerMessage(key, 'msg-2', 'user-1', baseDelayMs, maxDelayMs);
      expect(result.isLeader).toBe(false);
    });

    it('should extend delay for subsequent messages from the same user', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      const initialDelay = delayManager.getRemainingDelayMs(key);

      // Simulate time passing
      jest.spyOn(Date, 'now').mockReturnValue(now + 500);
      delayManager.registerMessage(key, 'msg-2', 'user-1', baseDelayMs, maxDelayMs);
      const extendedDelay = delayManager.getRemainingDelayMs(key);

      expect(extendedDelay).toBeGreaterThan(initialDelay);
      expect(extendedDelay).toBeLessThanOrEqual(maxDelayMs);
    });

    it('should not exceed maxDelayMs', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      // Register multiple messages to extend delay
      for (let i = 0; i < 5; i++) {
        delayManager.registerMessage(key, `msg-${i}`, 'user-1', baseDelayMs, maxDelayMs);
        jest.spyOn(Date, 'now').mockReturnValue(now + i * 500);
      }

      const delay = delayManager.getRemainingDelayMs(key);
      expect(delay).toBeLessThanOrEqual(maxDelayMs);
    });
  });

  describe('ensureMinimumDelay', () => {
    it('should enforce minimum delay', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      delayManager.ensureMinimumDelay(key, 2000, maxDelayMs);

      const delay = delayManager.getRemainingDelayMs(key);
      expect(delay).toBe(2000);
    });

    it('should not reduce delay if already above minimum', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      delayManager.ensureMinimumDelay(key, 500, maxDelayMs);

      const delay = delayManager.getRemainingDelayMs(key);
      expect(delay).toBe(baseDelayMs);
    });
  });

  describe('getReplyToMessageId', () => {
    it('should return undefined if only one message', () => {
      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      const replyToId = delayManager.getReplyToMessageId(key);
      expect(replyToId).toBeUndefined();
    });

    it('should return the latest message ID if multiple messages', () => {
      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      delayManager.registerMessage(key, 'msg-2', 'user-1', baseDelayMs, maxDelayMs);
      const replyToId = delayManager.getReplyToMessageId(key);
      expect(replyToId).toBe('msg-2');
    });
  });

  describe('waitForDelay', () => {
    it('should wait for the remaining delay', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      delayManager.registerMessage(key, 'msg-1', 'user-1', baseDelayMs, maxDelayMs);
      // Mock Date.now to simulate time passing
      const start = 1000;
      const end = start + baseDelayMs;
      jest.spyOn(Date, 'now').mockReturnValueOnce(start).mockReturnValueOnce(end);
      
      await delayManager.waitForDelay(key);
      
      expect(Date.now()).toBe(end); // Verify mock was used
    });
  });
});