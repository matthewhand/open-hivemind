import { formatNumber, formatDate, formatFileSize, truncateText } from '../formatters';

describe('formatters', () => {
  describe('formatNumber', () => {
    test('formats integers correctly', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(-1234)).toBe('-1,234');
    });

    test('formats decimals correctly', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
      expect(formatNumber(1234.56789, 2)).toBe('1,234.57');
      expect(formatNumber(1234.56789, 0)).toBe('1,235');
    });

    test('handles edge cases', () => {
      expect(formatNumber(NaN)).toBe('0');
      expect(formatNumber(Infinity)).toBe('0');
      expect(formatNumber(-Infinity)).toBe('0');
    });

    test('respects custom locale', () => {
      expect(formatNumber(1234.56, 2, 'de-DE')).toBe('1.234,56');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2023-12-25T10:30:00Z');

    test('formats date with default options', () => {
      const result = formatDate(testDate);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY or DD/MM/YYYY format
    });

    test('formats date with custom options', () => {
      const result = formatDate(testDate, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toBe('December 25, 2023');
    });

    test('handles invalid dates', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
    });

    test('respects custom locale', () => {
      const result = formatDate(testDate, {}, 'de-DE');
      expect(result).toBe('25.12.2023');
    });
  });

  describe('formatFileSize', () => {
    test('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1,023 B');
    });

    test('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    test('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    test('formats gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });

    test('handles negative values', () => {
      expect(formatFileSize(-1024)).toBe('0 B');
    });

    test('handles decimal precision', () => {
      expect(formatFileSize(1536, 0)).toBe('2 KB');
      expect(formatFileSize(1536, 3)).toBe('1.500 KB');
    });
  });

  describe('truncateText', () => {
    const longText = 'This is a very long text that should be truncated when it exceeds the maximum length';

    test('returns original text when shorter than max length', () => {
      expect(truncateText('Short text', 20)).toBe('Short text');
    });

    test('truncates text when longer than max length', () => {
      expect(truncateText(longText, 20)).toBe('This is a very lo...');
    });

    test('uses custom suffix', () => {
      expect(truncateText(longText, 20, ' [truncated]')).toBe('This is  [truncated]');
    });

    test('handles edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('text', 0)).toBe('...');
      expect(truncateText('text', -1)).toBe('...');
    });

    test('handles null and undefined', () => {
      expect(truncateText(null as string | null, 10)).toBe('');
      expect(truncateText(undefined as string | undefined, 10)).toBe('');
    });

    test('preserves word boundaries when requested', () => {
      expect(truncateText('This is a test sentence', 15, '...', true)).toBe('This is a...');
      expect(truncateText('This is a test', 12, '...', true)).toBe('This is a...');
    });
  });
});