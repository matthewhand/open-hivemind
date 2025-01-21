import { getEmoji } from '../../src/common/getEmoji';

describe('getEmoji', () => {
    const emojis = ['😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥'];

    test('should return a string', () => {
        const emoji = getEmoji();
        expect(typeof emoji).toBe('string');
    });

    test('should return a valid emoji from the predefined list', () => {
        const emoji = getEmoji();
        expect(emojis).toContain(emoji);
    });

    test('should return different emojis on multiple calls', () => {
        const generatedEmojis = new Set();
        for (let i = 0; i < 10; i++) {
            generatedEmojis.add(getEmoji());
        }
        expect(generatedEmojis.size).toBeGreaterThan(1);
    });
});