import { TimerRegistry } from '../../src/utils/TimerRegistry';

describe('TimerRegistry', () => {
  let registry: TimerRegistry;

  beforeEach(() => {
    TimerRegistry.resetInstance();
    registry = TimerRegistry.getInstance();
  });

  afterEach(() => {
    registry.clearAll();
    TimerRegistry.resetInstance();
  });

  it('should be a singleton', () => {
    const a = TimerRegistry.getInstance();
    const b = TimerRegistry.getInstance();
    expect(a).toBe(b);
  });

  describe('registerTimeout', () => {
    it('should register and track a timeout', () => {
      const id = registry.registerTimeout('test-timeout', jest.fn(), 10000);
      expect(registry.has(id)).toBe(true);
    });

    it('should return the provided id', () => {
      const id = registry.registerTimeout('my-id', jest.fn(), 5000);
      expect(id).toBe('my-id');
    });
  });

  describe('registerInterval', () => {
    it('should register and track an interval', () => {
      const id = registry.registerInterval('test-interval', jest.fn(), 10000);
      expect(registry.has(id)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear a specific timer', () => {
      registry.registerTimeout('to-clear', jest.fn(), 10000);
      expect(registry.has('to-clear')).toBe(true);
      const result = registry.clear('to-clear');
      expect(result).toBe(true);
      expect(registry.has('to-clear')).toBe(false);
    });

    it('should return false for non-existent timer', () => {
      expect(registry.clear('nonexistent')).toBe(false);
    });

    it('should clear intervals correctly', () => {
      registry.registerInterval('interval-to-clear', jest.fn(), 10000);
      const result = registry.clear('interval-to-clear');
      expect(result).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all timers', () => {
      registry.registerTimeout('t1', jest.fn(), 10000);
      registry.registerTimeout('t2', jest.fn(), 10000);
      registry.registerInterval('i1', jest.fn(), 10000);
      expect(registry.getStats().total).toBe(3);
      registry.clearAll();
      expect(registry.getStats().total).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      registry.registerTimeout('t1', jest.fn(), 10000);
      registry.registerInterval('i1', jest.fn(), 10000);
      const stats = registry.getStats();
      expect(stats.total).toBe(2);
      expect(stats.timeouts).toBe(1);
      expect(stats.intervals).toBe(1);
      expect(stats.oldestAge).toBeGreaterThanOrEqual(0);
    });

    it('should return zeros when empty', () => {
      const stats = registry.getStats();
      expect(stats.total).toBe(0);
      expect(stats.timeouts).toBe(0);
      expect(stats.intervals).toBe(0);
    });
  });

  describe('getTimerIds', () => {
    it('should return all registered timer IDs', () => {
      registry.registerTimeout('alpha', jest.fn(), 10000);
      registry.registerInterval('beta', jest.fn(), 10000);
      const ids = registry.getTimerIds();
      expect(ids).toContain('alpha');
      expect(ids).toContain('beta');
    });
  });

  describe('has', () => {
    it('should return true for existing timers', () => {
      registry.registerTimeout('exists', jest.fn(), 10000);
      expect(registry.has('exists')).toBe(true);
    });

    it('should return false for non-existing timers', () => {
      expect(registry.has('nope')).toBe(false);
    });
  });

  describe('resetInstance', () => {
    it('should allow creating a new instance', () => {
      const first = TimerRegistry.getInstance();
      first.registerTimeout('test', jest.fn(), 10000);
      TimerRegistry.resetInstance();
      const second = TimerRegistry.getInstance();
      expect(second.has('test')).toBe(false);
    });
  });
});
