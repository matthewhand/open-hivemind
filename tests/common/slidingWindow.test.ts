import { countWithinWindow, takeWithinWindow } from '../../src/common/slidingWindow';

type Entry = { ts: number; label: string };

const ts = (item: { ts: number }) => item.ts;

const make = (...timestamps: number[]): Entry[] =>
  timestamps.map((t, i) => ({ ts: t, label: `e${i}` }));

describe('slidingWindow', () => {
  describe('countWithinWindow', () => {
    it('returns 0 for an empty list', () => {
      expect(countWithinWindow([], ts, 100)).toBe(0);
    });

    it('counts every entry when all are strictly within the window', () => {
      const items = make(50, 60, 70);
      expect(countWithinWindow(items, ts, 40)).toBe(3);
    });

    it('counts 0 when every entry is at or below the threshold', () => {
      const items = make(10, 20, 30);
      expect(countWithinWindow(items, ts, 100)).toBe(0);
    });

    it('counts only the contiguous in-window suffix', () => {
      const items = make(10, 20, 30, 40, 50);
      // threshold 25 -> keep 30,40,50
      expect(countWithinWindow(items, ts, 25)).toBe(3);
    });

    it('treats an entry exactly on the threshold as expired (strict >)', () => {
      const items = make(10, 20, 30);
      // threshold 20 -> 20 is NOT kept, only 30 remains
      expect(countWithinWindow(items, ts, 20)).toBe(1);
    });
  });

  describe('takeWithinWindow', () => {
    it('returns an empty array for an empty list', () => {
      expect(takeWithinWindow([], ts, 100)).toEqual([]);
    });

    it('returns the in-window suffix in original order', () => {
      const items = make(10, 20, 30, 40, 50);
      const result = takeWithinWindow(items, ts, 25);
      expect(result.map((e) => e.ts)).toEqual([30, 40, 50]);
    });

    it('returns the same array reference when everything is in-window', () => {
      const items = make(50, 60, 70);
      const result = takeWithinWindow(items, ts, 10);
      // Reference reuse is a deliberate allocation optimisation.
      expect(result).toBe(items);
    });

    it('returns a fresh sliced array (not the original) when some entries expire', () => {
      const items = make(10, 20, 30);
      const result = takeWithinWindow(items, ts, 15);
      expect(result).not.toBe(items);
      expect(result.map((e) => e.ts)).toEqual([20, 30]);
      // Original list is untouched.
      expect(items).toHaveLength(3);
    });

    it('returns an empty array when every entry is expired', () => {
      const items = make(10, 20, 30);
      expect(takeWithinWindow(items, ts, 100)).toEqual([]);
    });

    it('keeps a single newest entry on the boundary correctly', () => {
      const items = make(99, 100, 101);
      // threshold 100 -> only 101 kept (100 is on the boundary => expired)
      expect(takeWithinWindow(items, ts, 100).map((e) => e.ts)).toEqual([101]);
    });

    it('works with a custom timestamp extractor (Date-based entries)', () => {
      const items = [
        { when: new Date(1000) },
        { when: new Date(2000) },
        { when: new Date(3000) },
      ];
      const result = takeWithinWindow(items, (x) => x.when.getTime(), 1500);
      expect(result.map((x) => x.when.getTime())).toEqual([2000, 3000]);
    });
  });
});
