import { getEmoji } from '../../../src/utils/common';

describe('getEmoji', () => {
  it('should return specific emojis for known keywords', () => {
    expect(getEmoji('success')).toBe('✅');
    expect(getEmoji('error')).toBe('❌');
    expect(getEmoji('warning')).toBe('⚠️');
    expect(getEmoji('SUCCESS')).toBe('✅'); // case insensitive
  });

  it('should return default bot emoji for unknown keywords', () => {
    expect(getEmoji('unknown')).toBe('🤖');
    expect(getEmoji('something')).toBe('🤖');
  });

  it('should return a random emoji from the list if no keyword is provided', () => {
    const emojis = [
      '😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎',
      '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥',
    ];
    const result = getEmoji();
    expect(emojis).toContain(result);
  });
});
