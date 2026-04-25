import { getEmoji } from '../../../src/utils/common';

describe('getEmoji', () => {
  it('should return a random emoji from the list', () => {
    const emojis = [
      '😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎',
      '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥',
    ];
    const result = getEmoji();
    expect(emojis).toContain(result);
  });
});
