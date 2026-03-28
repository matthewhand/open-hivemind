import processingLocks from '../../../src/message/processing/processingLocks';

describe('ProcessingLocks', () => {
  afterEach(() => {
    // Unlock all channels used in tests
    processingLocks.unlock('ch-1');
    processingLocks.unlock('ch-2');
    processingLocks.unlock('ch-1', 'bot-1');
    processingLocks.unlock('ch-1', 'bot-2');
  });

  describe('isLocked', () => {
    it('should return false for an unlocked channel', () => {
      expect(processingLocks.isLocked('ch-1')).toBe(false);
    });

    it('should return true for a locked channel', () => {
      processingLocks.lock('ch-1');
      expect(processingLocks.isLocked('ch-1')).toBe(true);
    });
  });

  describe('lock', () => {
    it('should lock a channel', () => {
      processingLocks.lock('ch-2');
      expect(processingLocks.isLocked('ch-2')).toBe(true);
    });

    it('should lock per-bot within the same channel', () => {
      processingLocks.lock('ch-1', 'bot-1');
      expect(processingLocks.isLocked('ch-1', 'bot-1')).toBe(true);
      expect(processingLocks.isLocked('ch-1', 'bot-2')).toBe(false);
      expect(processingLocks.isLocked('ch-1')).toBe(false);
    });
  });

  describe('unlock', () => {
    it('should unlock a locked channel', () => {
      processingLocks.lock('ch-1');
      processingLocks.unlock('ch-1');
      expect(processingLocks.isLocked('ch-1')).toBe(false);
    });

    it('should unlock per-bot', () => {
      processingLocks.lock('ch-1', 'bot-1');
      processingLocks.unlock('ch-1', 'bot-1');
      expect(processingLocks.isLocked('ch-1', 'bot-1')).toBe(false);
    });

    it('should be safe to unlock a channel that is not locked', () => {
      expect(() => processingLocks.unlock('nonexistent')).not.toThrow();
    });
  });

  describe('key generation', () => {
    it('should use channelId:botId as key when botId is provided', () => {
      processingLocks.lock('ch-1', 'bot-1');
      // The channel without botId should not be locked
      expect(processingLocks.isLocked('ch-1')).toBe(false);
      // But with botId it should be
      expect(processingLocks.isLocked('ch-1', 'bot-1')).toBe(true);
    });
  });
});
