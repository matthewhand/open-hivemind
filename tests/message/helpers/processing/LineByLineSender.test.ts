import {
  calculateLineDelay,
  calculateLineDelayWithOptions,
  splitOnNewlines,
} from '../../../../src/message/helpers/processing/LineByLineSender';

describe('LineByLineSender', () => {
  describe('splitOnNewlines', () => {
    it('should return empty array for empty input', () => {
      expect(splitOnNewlines('')).toEqual([]);
      expect(splitOnNewlines(null as any)).toEqual([]);
      expect(splitOnNewlines(undefined as any)).toEqual([]);
    });

    it('should split on newlines', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const expected = ['Line 1', 'Line 2', 'Line 3'];
      expect(splitOnNewlines(input)).toEqual(expected);
    });

    it('should handle Windows line endings', () => {
      const input = 'Line 1\r\nLine 2';
      expect(splitOnNewlines(input)).toEqual(['Line 1', 'Line 2']);
    });

    it('should handle literal escaped newlines', () => {
      const input = 'Line 1\\nLine 2';
      expect(splitOnNewlines(input)).toEqual(['Line 1', 'Line 2']);
    });

    it('should remove empty lines by default', () => {
      const input = 'Line 1\n\nLine 2\n   \nLine 3';
      expect(splitOnNewlines(input)).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should preserve empty lines if requested', () => {
      const input = 'Line 1\n\nLine 2';
      expect(splitOnNewlines(input, true)).toEqual(['Line 1', '', 'Line 2']);
    });

    it('should trim lines by default', () => {
      const input = '  Line 1  \n  Line 2  ';
      expect(splitOnNewlines(input)).toEqual(['Line 1', 'Line 2']);
    });

    it('should dedupe repeated lines using normalization', () => {
      const input = 'Line 1\nLine 1 \n line   1\nLine 2\nLINE 1';
      expect(splitOnNewlines(input)).toEqual(['Line 1', 'Line 2']);
    });
  });

  describe('calculateLineDelay', () => {
    it('should use default base delay', () => {
      // Post-typing delay defaults to 0.
      expect(calculateLineDelay(10)).toBe(0);
    });

    it('should allow custom base delay', () => {
      // Base delay is respected when provided.
      expect(calculateLineDelay(10, 1000)).toBe(1000);
    });

    it('should cap reading delay at 8000ms', () => {
      // Default per-char delay is 0, so no extra delay.
      expect(calculateLineDelay(1000)).toBe(0);
    });

    it('should handle zero length line', () => {
      expect(calculateLineDelay(0)).toBe(0);
    });
  });

  describe('calculateLineDelayWithOptions', () => {
    it('should scale per-char and max cap via options', () => {
      // perCharMs=90, maxReadingMs=24000, baseDelay=6000 (typical delayScale=3)
      // 1000 chars => 90000ms capped to 24000. Total 30000.
      expect(
        calculateLineDelayWithOptions(1000, 6000, { perCharMs: 90, maxReadingMs: 24000 })
      ).toBe(30000);
    });
  });
});
