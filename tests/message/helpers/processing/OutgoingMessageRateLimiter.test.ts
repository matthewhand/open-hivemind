import { OutgoingMessageRateLimiter } from '../../../../src/message/helpers/processing/OutgoingMessageRateLimiter';

describe('OutgoingMessageRateLimiter', () => {
  let limiter: OutgoingMessageRateLimiter;

  beforeEach(() => {
    limiter = OutgoingMessageRateLimiter.getInstance();
    limiter.clear();
  });

  it('should be a singleton', () => {
    const a = OutgoingMessageRateLimiter.getInstance();
    const b = OutgoingMessageRateLimiter.getInstance();
    expect(a).toBe(b);
  });

  describe('getBackoffMs', () => {
    it('should return 0 when under the rate limit', () => {
      const backoff = limiter.getBackoffMs('ch-1', 5, 60000);
      expect(backoff).toBe(0);
    });

    it('should return a positive backoff when limit is exceeded', () => {
      for (let i = 0; i < 5; i++) {
        limiter.recordSend('ch-1');
      }
      const backoff = limiter.getBackoffMs('ch-1', 5, 60000);
      expect(backoff).toBeGreaterThan(0);
    });

    it('should return at least 250ms for backoff', () => {
      for (let i = 0; i < 10; i++) {
        limiter.recordSend('ch-2');
      }
      const backoff = limiter.getBackoffMs('ch-2', 3, 60000);
      expect(backoff).toBeGreaterThanOrEqual(250);
    });
  });

  describe('recordSend', () => {
    it('should record a send event', () => {
      limiter.recordSend('ch-1');
      const stats = limiter.getStats();
      expect(stats.channelsCount).toBeGreaterThanOrEqual(1);
      expect(stats.totalTimestamps).toBeGreaterThanOrEqual(1);
    });
  });

  describe('clear', () => {
    it('should clear all channels when no argument given', () => {
      limiter.recordSend('ch-1');
      limiter.recordSend('ch-2');
      limiter.clear();
      const stats = limiter.getStats();
      expect(stats.channelsCount).toBe(0);
      expect(stats.totalTimestamps).toBe(0);
    });

    it('should clear only the specified channel', () => {
      limiter.recordSend('ch-1');
      limiter.recordSend('ch-2');
      limiter.clear('ch-1');
      const stats = limiter.getStats();
      expect(stats.channelsCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      limiter.recordSend('ch-1');
      limiter.recordSend('ch-1');
      limiter.recordSend('ch-2');
      const stats = limiter.getStats();
      expect(stats.channelsCount).toBe(2);
      expect(stats.totalTimestamps).toBe(3);
      expect(stats.maxChannels).toBeGreaterThan(0);
    });
  });
});
