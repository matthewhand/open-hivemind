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

    // Consolidated test for basic properties of the returned error message
    test('should return a valid, non-empty, themed string with an emoji', () => {
        const message = getRandomErrorMessage();

        // Check 1: Is it a string and is it in the list of expected messages?
        expect(typeof message).toBe('string');
        expect(expectedErrorMessages).toContain(message);

        // Check 2: Is it a non-empty string?
        expect(message.trim().length).toBeGreaterThan(10);

        // Check 3: Does it contain an emoji?
        const hasEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]/u.test(message);
        expect(hasEmoji).toBe(true);

        // Check 4: Does it have robot-themed content?
        const robotKeywords = ['circuits', 'digital', 'byte', 'binary', 'code', 'bits', 'gears', 'pixels', 'sensors', 'virtual', 'loop'];
        const hasRobotTheme = robotKeywords.some(keyword => message.toLowerCase().includes(keyword));
        expect(hasRobotTheme).toBe(true);

        // Check 5: Does it have a friendly/humorous tone?
        const friendlyWords = ['oops', 'whoa', 'ah', 'yikes', 'gosh', 'oopsie', 'uh-oh', 'hold on', 'bumble', 'pickle', 'spilled'];
        const hasFriendlyTone = friendlyWords.some(word => message.toLowerCase().includes(word));
        expect(hasFriendlyTone).toBe(true);
    });

    // Test for randomness and distribution
    test('should demonstrate randomness and good distribution', () => {
        const messageCount: Record<string, number> = {};
        const iterations = 1000;
        const messages = new Set<string>();

        for (let i = 0; i < iterations; i++) {
            const message = getRandomErrorMessage();
            messages.add(message);
            messageCount[message] = (messageCount[message] || 0) + 1;
        }

        // Check 1: Returns different messages
        expect(messages.size).toBeGreaterThan(1);

        // Check 2: Reasonable distribution
        const uniqueMessages = Object.keys(messageCount).length;
        expect(uniqueMessages).toBeGreaterThanOrEqual(expectedErrorMessages.length * 0.8);
        const maxCount = Math.max(...Object.values(messageCount));
        const maxPercentage = (maxCount / iterations) * 100;
        expect(maxPercentage).toBeLessThan(25);
    });

    // Test for performance
    test('should execute quickly and without memory leaks', () => {
        // Check 1: Speedy execution
        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
            getRandomErrorMessage();
        }
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(100);

        // Check 2: No significant memory increase
        const initialMemory = process.memoryUsage().heapUsed;
        for (let i = 0; i < 10000; i++) {
            getRandomErrorMessage();
        }
        const finalMemory = process.memoryUsage().heapUsed;
        expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024);
    });

    // Test for edge cases
    test('should handle module reloading and maintain stability', () => {
        // Check 1: Module reloading
        const message1 = getRandomErrorMessage();
        expect(expectedErrorMessages).toContain(message1);

        jest.resetModules();
        const { getRandomErrorMessage: reloadedFunction } = require('../../../src/common/errors/getRandomErrorMessage');
        const message2 = reloadedFunction();
        expect(expectedErrorMessages).toContain(message2);

        // Check 2: Stability after many calls
        for (let i = 0; i < 5000; i++) {
            const message = getRandomErrorMessage();
            expect(expectedErrorMessages).toContain(message);
        }
    });
});
