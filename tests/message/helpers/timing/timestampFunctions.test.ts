import {
  getLastTypingTimestamp,
  getLastMessageTimestamp,
  logMessageTimestamp,
} from '../../../../src/message/helpers/timing/timestampFunctions';

describe('timestampFunctions', () => {
  describe('getLastTypingTimestamp', () => {
    it('should return the stored timestamp for a channel', () => {
      const map = new Map<string, number>();
      map.set('channel-1', 12345);
      expect(getLastTypingTimestamp(map, 'channel-1')).toBe(12345);
    });

    it('should return Date.now() when no timestamp is recorded', () => {
      const map = new Map<string, number>();
      const before = Date.now();
      const result = getLastTypingTimestamp(map, 'unknown');
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('getLastMessageTimestamp', () => {
    it('should return the stored timestamp for a channel', () => {
      const map = new Map<string, number>();
      map.set('channel-1', 99999);
      expect(getLastMessageTimestamp(map, 'channel-1')).toBe(99999);
    });

    it('should return 0 when no timestamp is recorded', () => {
      const map = new Map<string, number>();
      expect(getLastMessageTimestamp(map, 'unknown')).toBe(0);
    });
  });

  describe('logMessageTimestamp', () => {
    it('should record the current time for a channel', () => {
      const map = new Map<string, number>();
      const before = Date.now();
      logMessageTimestamp(map, 'channel-1');
      const after = Date.now();

      const recorded = map.get('channel-1');
      expect(recorded).toBeDefined();
      expect(recorded).toBeGreaterThanOrEqual(before);
      expect(recorded).toBeLessThanOrEqual(after);
    });

    it('should overwrite previous timestamps', () => {
      const map = new Map<string, number>();
      map.set('channel-1', 100);
      logMessageTimestamp(map, 'channel-1');
      expect(map.get('channel-1')).toBeGreaterThan(100);
    });
  });
});
