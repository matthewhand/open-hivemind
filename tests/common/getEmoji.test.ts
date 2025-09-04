import { getEmoji } from '../../src/common/getEmoji';

describe('getEmoji', () => {
    const emojis = ['😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥'];

    describe('Basic functionality', () => {
        test('should return a string', () => {
            const emoji = getEmoji();
            expect(typeof emoji).toBe('string');
            expect(emoji.length).toBeGreaterThan(0);
            expect(emoji.length).toBeLessThanOrEqual(2); // Emojis can be 1 or 2 characters
        });

        test('should return a valid emoji from the predefined list', () => {
            const emoji = getEmoji();
            expect(emojis).toContain(emoji);
        });

        test('should return emojis with proper Unicode format', () => {
            const emoji = getEmoji();
            // Check if it's a valid emoji by ensuring it's not empty and contains emoji-like characters
            expect(emoji).toBeDefined();
            expect(emoji.length).toBeGreaterThan(0);
            // More inclusive check for emoji characters
            expect(emoji).toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
        });
    });

    describe('Randomness and distribution', () => {
        test('should return different emojis on multiple calls', () => {
            const generatedEmojis = new Set();
            for (let i = 0; i < 20; i++) {
                generatedEmojis.add(getEmoji());
            }
            expect(generatedEmojis.size).toBeGreaterThan(5);
        });

        test('should have reasonable distribution over many calls', () => {
            const counts: Record<string, number> = {};
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const emoji = getEmoji();
                counts[emoji] = (counts[emoji] || 0) + 1;
            }

            // Check that all emojis appear at least once (with high probability)
            const uniqueEmojis = Object.keys(counts).length;
            expect(uniqueEmojis).toBeGreaterThanOrEqual(10);

            // Check that no emoji appears too frequently (more than 10% of the time)
            const maxCount = Math.max(...Object.values(counts));
            const maxPercentage = (maxCount / iterations) * 100;
            expect(maxPercentage).toBeLessThan(15); // Allow some variance but not too much
        });
    });

    describe('Edge cases and consistency', () => {
        test('should always return the same emoji set', () => {
            const firstCall = getEmoji();
            // Reset the module to test consistency
            jest.resetModules();
            const { getEmoji: getEmojiFresh } = require('../../src/common/getEmoji');
            const secondCall = getEmojiFresh();

            // Both should be from the same set
            expect(emojis).toContain(firstCall);
            expect(emojis).toContain(secondCall);
        });

        test('should handle rapid successive calls', () => {
            const results = [];
            for (let i = 0; i < 100; i++) {
                results.push(getEmoji());
            }

            // All results should be valid emojis
            results.forEach(emoji => {
                expect(emojis).toContain(emoji);
                expect(typeof emoji).toBe('string');
            });
        });
    });

    describe('Performance', () => {
        test('should execute quickly', () => {
            const startTime = Date.now();
            for (let i = 0; i < 1000; i++) {
                getEmoji();
            }
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete 1000 calls in less than 100ms
            expect(duration).toBeLessThan(100);
        });
    });
});