import { splitMessageContent } from '../../../../src/message/helpers/processing/splitMessageContent';

describe('splitMessageContent', () => {
  it('should return valid message as is', () => {
    const text = 'Hello world';
    expect(splitMessageContent(text)).toEqual(['Hello world']);
  });

  it('should split long messages', () => {
    const text = 'a'.repeat(3000);
    const parts = splitMessageContent(text);
    expect(parts.length).toBe(2);

    // First part should be max length (1997) and end with ...
    // Actually, logic adds ... so it might be 1997
    expect(parts[0].length).toBeLessThanOrEqual(1997);
    expect(parts[0].endsWith('...')).toBe(true);

    // Second part should start with ...
    expect(parts[1].startsWith('...')).toBe(true);
  });

  it('should split at nearest space', () => {
    const prefix = 'a'.repeat(1990);
    const text = `${prefix} cut here`; // " cut" puts it over 1997 potentially?
    // 1990 + 9 = 1999.

    const parts = splitMessageContent(text, 1997);
    // It should try to cut at space
    expect(parts[0]).not.toContain('cut here');
    expect(parts[1]).toContain('cut here');
  });

  it('should handle custom max length', () => {
    // Enforced min is 10. String len 20. Should split.
    const text = '12345678901234567890';
    const parts = splitMessageContent(text, 10);
    expect(parts.length).toBeGreaterThan(1);
  });

  it('should unexpected handle long whitespace sequences', () => {
    // Force a split where trimEnd() might make it empty
    // maxLength 10. "   ...   "
    const text = '          ' + 'A'; // 10 spaces + A. 11 chars.
    // It won't fit in 10.
    // Chunk 1: take 7 chars (10-3). "       ".
    // trimEnd() -> "".
    // Logic should fallback to taking 1 char non-trimmed -> " ".
    // Then loop advances.
    const parts = splitMessageContent(text, 10);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]).toContain('...');
  });
});
