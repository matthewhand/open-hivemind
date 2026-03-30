import { GlobalActivityTracker } from '../../../../src/message/helpers/processing/GlobalActivityTracker';

describe('GlobalActivityTracker', () => {
  let tracker: GlobalActivityTracker;

  beforeEach(() => {
    // Access singleton; scores should be tested fresh
    tracker = GlobalActivityTracker.getInstance();
  });

  it('should be a singleton', () => {
    const a = GlobalActivityTracker.getInstance();
    const b = GlobalActivityTracker.getInstance();
    expect(a).toBe(b);
  });

  describe('getScore', () => {
    it('should return 0 for a new/unknown bot', () => {
      const score = tracker.getScore('unknown-bot-' + Date.now());
      expect(score).toBe(0);
    });
  });

  describe('recordActivity', () => {
    it('should increase the score when activity is recorded', () => {
      const botId = 'test-bot-' + Date.now();
      tracker.recordActivity(botId, 1.0);
      expect(tracker.getScore(botId)).toBeGreaterThan(0);
    });

    it('should accept a custom cost parameter', () => {
      const botId = 'cost-bot-' + Date.now();
      tracker.recordActivity(botId, 2.5);
      expect(tracker.getScore(botId)).toBeGreaterThanOrEqual(2.0);
    });

    it('should cap at SCORE_LIMIT (5.0)', () => {
      const botId = 'capped-bot-' + Date.now();
      for (let i = 0; i < 20; i++) {
        tracker.recordActivity(botId, 1.0);
      }
      expect(tracker.getScore(botId)).toBeLessThanOrEqual(5.0);
    });
  });

  describe('score decay', () => {
    it('should return a non-negative score', () => {
      const botId = 'decay-bot-' + Date.now();
      tracker.recordActivity(botId, 0.1);
      // Even after getting the score, it should be >= 0
      expect(tracker.getScore(botId)).toBeGreaterThanOrEqual(0);
    });
  });
});
