const TimingManager = require('../../src/managers/TimingManager');

describe('TimingManager', () => {
  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const tm = new TimingManager();
      expect(tm.minDelay).toBe(1000);
      expect(tm.maxDelay).toBe(10000);
      expect(tm.decayRate).toBe(-0.5);
    });

    it('should accept custom config', () => {
      const tm = new TimingManager({ minDelay: 500, maxDelay: 5000, decayRate: -1 });
      expect(tm.minDelay).toBe(500);
      expect(tm.maxDelay).toBe(5000);
      expect(tm.decayRate).toBe(-1);
    });

    it('should throw when minDelay > maxDelay', () => {
      expect(() => new TimingManager({ minDelay: 5000, maxDelay: 1000, decayRate: 0 })).toThrow(
        'minDelay cannot be greater than maxDelay'
      );
    });
  });

  describe('logIncomingMessage', () => {
    it('should record the current time for a channel', () => {
      const tm = new TimingManager();
      const before = Date.now();
      tm.logIncomingMessage('ch-1');
      const after = Date.now();

      const info = tm.channelsTimingInfo['ch-1'];
      expect(info).not.toBeUndefined();
      expect(info.lastIncomingMessageTime).toBeGreaterThanOrEqual(before);
      expect(info.lastIncomingMessageTime).toBeLessThanOrEqual(after);
    });
  });

  describe('calculateDelay', () => {
    it('should return maxDelay when no incoming message is logged', () => {
      const tm = new TimingManager({ minDelay: 100, maxDelay: 5000, decayRate: -0.5 });
      const delay = tm.calculateDelay('unknown-ch', 0);
      expect(delay).toBe(5000);
    });

    it('should return minDelay for very recent activity', () => {
      const tm = new TimingManager({ minDelay: 100, maxDelay: 5000, decayRate: -0.5 });
      tm.logIncomingMessage('ch-1');
      const delay = tm.calculateDelay('ch-1', 0);
      expect(delay).toBe(100);
    });

    it('should return a delay within bounds', () => {
      const tm = new TimingManager({ minDelay: 100, maxDelay: 5000, decayRate: -0.5 });
      tm.logIncomingMessage('ch-1');
      const delay = tm.calculateDelay('ch-1', 500);
      expect(delay).toBeGreaterThanOrEqual(100);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('scheduleMessage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should call the send function after delay', () => {
      const tm = new TimingManager({ minDelay: 100, maxDelay: 5000, decayRate: -0.5 });
      const sendFn = jest.fn();
      tm.logIncomingMessage('ch-1');
      tm.scheduleMessage('ch-1', 'hello', 0, sendFn);

      jest.advanceTimersByTime(200);
      expect(sendFn).toHaveBeenCalledWith('hello');
    });

    it('should cancel previous timer when scheduling again for same channel', () => {
      const tm = new TimingManager({ minDelay: 100, maxDelay: 5000, decayRate: -0.5 });
      const sendFn1 = jest.fn();
      const sendFn2 = jest.fn();
      tm.logIncomingMessage('ch-1');

      tm.scheduleMessage('ch-1', 'first', 0, sendFn1);
      tm.scheduleMessage('ch-1', 'second', 0, sendFn2);

      jest.advanceTimersByTime(200);
      expect(sendFn1).not.toHaveBeenCalled();
      expect(sendFn2).toHaveBeenCalledWith('second');
    });

    it('should not throw if send function throws', () => {
      const tm = new TimingManager({ minDelay: 100, maxDelay: 5000, decayRate: -0.5 });
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const sendFn = jest.fn(() => { throw new Error('send failed'); });
      tm.logIncomingMessage('ch-1');

      tm.scheduleMessage('ch-1', 'msg', 0, sendFn);
      expect(() => jest.advanceTimersByTime(200)).not.toThrow();
      errorSpy.mockRestore();
    });
  });
});
