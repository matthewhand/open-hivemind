
import { splitOnNewlines, calculateLineDelay, calculateLineDelayWithOptions } from '../../../../src/message/helpers/processing/LineByLineSender';

describe('LineByLineSender', () => {

    describe('splitOnNewlines', () => {
        it('should return empty array for empty input', () => {
            expect(splitOnNewlines('')).toEqual([]);
            expect(splitOnNewlines(null as any)).toEqual([]);
            expect(splitOnNewlines(undefined as any)).toEqual([]);
        });

        it('should split on newlines', () => {
            const input = "Line 1\nLine 2\nLine 3";
            const expected = ["Line 1", "Line 2", "Line 3"];
            expect(splitOnNewlines(input)).toEqual(expected);
        });

        it('should handle Windows line endings', () => {
            const input = "Line 1\r\nLine 2";
            expect(splitOnNewlines(input)).toEqual(["Line 1", "Line 2"]);
        });

        it('should handle literal escaped newlines', () => {
            const input = "Line 1\\nLine 2";
            expect(splitOnNewlines(input)).toEqual(["Line 1", "Line 2"]);
        });

        it('should remove empty lines by default', () => {
            const input = "Line 1\n\nLine 2\n   \nLine 3";
            expect(splitOnNewlines(input)).toEqual(["Line 1", "Line 2", "Line 3"]);
        });

        it('should preserve empty lines if requested', () => {
            const input = "Line 1\n\nLine 2";
            expect(splitOnNewlines(input, true)).toEqual(["Line 1", "", "Line 2"]);
        });

        it('should trim lines by default', () => {
            const input = "  Line 1  \n  Line 2  ";
            expect(splitOnNewlines(input)).toEqual(["Line 1", "Line 2"]);
        });
    });

    describe('calculateLineDelay', () => {
        it('should use default base delay', () => {
            // 10 chars * 30ms = 300ms. Base 2000. Total 2300.
            expect(calculateLineDelay(10)).toBe(2300);
        });

        it('should allow custom base delay', () => {
            // 10 chars * 30ms = 300ms. Base 1000. Total 1300.
            expect(calculateLineDelay(10, 1000)).toBe(1300);
        });

        it('should cap reading delay at 8000ms', () => {
            // 1000 chars * 30ms = 30000ms. Capped at 8000.
            // Base 2000. Total 10000.
            expect(calculateLineDelay(1000)).toBe(10000);
        });

        it('should handle zero length line', () => {
            // 0 * 30 = 0. Base 2000. Total 2000.
            expect(calculateLineDelay(0)).toBe(2000);
        });
    });

    describe('calculateLineDelayWithOptions', () => {
        it('should scale per-char and max cap via options', () => {
            // perCharMs=90, maxReadingMs=24000, baseDelay=6000 (typical delayScale=3)
            // 1000 chars => 90000ms capped to 24000. Total 30000.
            expect(calculateLineDelayWithOptions(1000, 6000, { perCharMs: 90, maxReadingMs: 24000 })).toBe(30000);
        });
    });
});
