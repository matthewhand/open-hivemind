import { getRandomErrorMessage } from '../../../src/common/errors/getRandomErrorMessage';

describe('getRandomErrorMessage', () => {
    const expectedErrorMessages = [
        'Oops, my circuits got tangled in digital spaghetti! 🍝🤖',
        'Whoa, I tripped over a virtual shoelace! 🤖👟',
        'Ah, I just had a byte-sized hiccup! 🤖🍔',
        'Looks like I bumbled the binary! 💾🐝',
        'Yikes, my code caught a digital cold! 🤖🤧',
        'Gosh, I stumbled into a loop hole! 🌀🤖',
        'Oopsie, I accidentally swapped my bits with bytes! 🔄🤖',
        'My gears are in a jam, quite a pickle indeed! 🤖🥒',
        'Uh-oh, I spilled some pixels here! 🤖🎨',
        'Hold on, recalibrating my humor sensors! 🤖😂',
    ];

    describe('Basic functionality', () => {
        it('should return a string', () => {
            const message = getRandomErrorMessage();
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
        });

        it('should return a valid error message from the predefined list', () => {
            const message = getRandomErrorMessage();
            expect(expectedErrorMessages).toContain(message);
        });

        it('should return non-empty messages', () => {
            for (let i = 0; i < 20; i++) {
                const message = getRandomErrorMessage();
                expect(message.trim()).not.toBe('');
                expect(message.length).toBeGreaterThan(10); // Reasonable minimum length
            }
        });
    });

    describe('Randomness and distribution', () => {
        it('should return different error messages on multiple calls', () => {
            const messages = new Set();
            for (let i = 0; i < 20; i++) {
                messages.add(getRandomErrorMessage());
            }
            expect(messages.size).toBeGreaterThan(1);
        });

        it('should have reasonable distribution over many calls', () => {
            const messageCount: Record<string, number> = {};
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const message = getRandomErrorMessage();
                messageCount[message] = (messageCount[message] || 0) + 1;
            }

            // Should see most or all messages
            const uniqueMessages = Object.keys(messageCount).length;
            expect(uniqueMessages).toBeGreaterThanOrEqual(expectedErrorMessages.length * 0.8);

            // No message should dominate (more than 20% of calls)
            const maxCount = Math.max(...Object.values(messageCount));
            const maxPercentage = (maxCount / iterations) * 100;
            expect(maxPercentage).toBeLessThan(25);
        });

        it('should eventually return all available messages', () => {
            const seenMessages = new Set<string>();
            let attempts = 0;
            const maxAttempts = 1000;

            while (seenMessages.size < expectedErrorMessages.length && attempts < maxAttempts) {
                seenMessages.add(getRandomErrorMessage());
                attempts++;
            }

            expect(seenMessages.size).toBe(expectedErrorMessages.length);
            expectedErrorMessages.forEach(expectedMessage => {
                expect(seenMessages.has(expectedMessage)).toBe(true);
            });
        });
    });

    describe('Message content validation', () => {
        it('should return messages with emoji characters', () => {
            const messages = new Set();
            for (let i = 0; i < 50; i++) {
                messages.add(getRandomErrorMessage());
            }

            messages.forEach(message => {
                // Check for emoji presence (basic Unicode emoji ranges)
                const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message);
                expect(hasEmoji).toBe(true);
            });
        });

        it('should return messages with robot-themed content', () => {
            const robotKeywords = ['circuits', 'digital', 'byte', 'binary', 'code', 'bits', 'gears', 'pixels', 'sensors'];
            const messages = new Set();
            
            for (let i = 0; i < 100; i++) {
                messages.add(getRandomErrorMessage());
            }

            let robotThemeCount = 0;
            messages.forEach(message => {
                const hasRobotTheme = robotKeywords.some(keyword => 
                    message.toLowerCase().includes(keyword)
                );
                if (hasRobotTheme) robotThemeCount++;
            });

            // Most messages should have robot-themed content
            expect(robotThemeCount).toBeGreaterThan(messages.size * 0.7);
        });

        it('should return messages with appropriate tone (friendly/humorous)', () => {
            const friendlyWords = ['oops', 'whoa', 'ah', 'yikes', 'gosh', 'oopsie', 'uh-oh', 'hold on'];
            const messages = new Set();
            
            for (let i = 0; i < 100; i++) {
                messages.add(getRandomErrorMessage());
            }

            let friendlyToneCount = 0;
            messages.forEach(message => {
                const hasFriendlyTone = friendlyWords.some(word => 
                    message.toLowerCase().includes(word)
                );
                if (hasFriendlyTone) friendlyToneCount++;
            });

            // Most messages should have friendly tone
            expect(friendlyToneCount).toBeGreaterThan(messages.size * 0.6);
        });
    });

    describe('Performance and consistency', () => {
        it('should execute quickly', () => {
            const startTime = Date.now();
            for (let i = 0; i < 1000; i++) {
                getRandomErrorMessage();
            }
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete 1000 calls in less than 100ms
            expect(duration).toBeLessThan(100);
        });

        it('should be consistent across rapid successive calls', () => {
            const messages = [];
            for (let i = 0; i < 100; i++) {
                messages.push(getRandomErrorMessage());
            }

            // All messages should be valid
            messages.forEach(message => {
                expect(typeof message).toBe('string');
                expect(expectedErrorMessages).toContain(message);
            });
        });

        it('should not have memory leaks with many calls', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < 10000; i++) {
                getRandomErrorMessage();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be minimal (less than 1MB)
            expect(memoryIncrease).toBeLessThan(1024 * 1024);
        });
    });

    describe('Edge cases', () => {
        it('should handle module reloading', () => {
            const message1 = getRandomErrorMessage();
            expect(expectedErrorMessages).toContain(message1);

            // Simulate module reload
            jest.resetModules();
            const { getRandomErrorMessage: reloadedFunction } = require('../../../src/common/errors/getRandomErrorMessage');
            
            const message2 = reloadedFunction();
            expect(expectedErrorMessages).toContain(message2);
        });

        it('should maintain functionality after many calls', () => {
            // Call function many times to test for any state corruption
            for (let i = 0; i < 5000; i++) {
                const message = getRandomErrorMessage();
                expect(expectedErrorMessages).toContain(message);
            }
        });
    });
});