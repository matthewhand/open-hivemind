import {
  recordBotActivity,
  getLastBotActivity,
  getRecentChannelActivity,
  clearBotActivity,
} from '../../../../src/message/helpers/processing/ChannelActivity';

describe('ChannelActivity', () => {
  afterEach(() => {
    clearBotActivity();
  });

  describe('recordBotActivity / getLastBotActivity', () => {
    it('should record and retrieve bot activity timestamp', () => {
      const before = Date.now();
      recordBotActivity('ch-1', 'bot-1');
      const after = Date.now();

      const ts = getLastBotActivity('ch-1', 'bot-1');
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('should return 0 for unknown channel/bot', () => {
      expect(getLastBotActivity('unknown', 'unknown')).toBe(0);
    });
  });

  describe('getRecentChannelActivity', () => {
    it('should return activities after the given timestamp', () => {
      const before = Date.now() - 1;
      recordBotActivity('ch-1', 'bot-1');
      recordBotActivity('ch-1', 'bot-2');

      const activities = getRecentChannelActivity('ch-1', before);
      expect(activities.length).toBe(2);
      expect(activities[0].botId).toBe('bot-1');
      expect(activities[1].botId).toBe('bot-2');
    });

    it('should return empty array for unknown channel', () => {
      expect(getRecentChannelActivity('unknown', 0)).toEqual([]);
    });

    it('should filter by timestamp', () => {
      recordBotActivity('ch-1', 'bot-1');
      const futureTimestamp = Date.now() + 100000;
      const activities = getRecentChannelActivity('ch-1', futureTimestamp);
      expect(activities.length).toBe(0);
    });
  });

  describe('clearBotActivity', () => {
    it('should clear all activity when no channelId given', () => {
      recordBotActivity('ch-1', 'bot-1');
      recordBotActivity('ch-2', 'bot-1');
      clearBotActivity();
      expect(getLastBotActivity('ch-1', 'bot-1')).toBe(0);
      expect(getLastBotActivity('ch-2', 'bot-1')).toBe(0);
    });

    it('should clear only the specified channel', () => {
      recordBotActivity('ch-1', 'bot-1');
      recordBotActivity('ch-2', 'bot-1');
      clearBotActivity('ch-1');
      expect(getLastBotActivity('ch-1', 'bot-1')).toBe(0);
      expect(getLastBotActivity('ch-2', 'bot-1')).toBeGreaterThan(0);
    });
  });
});
