import { getRandomErrorMessage } from '../../../src/common/errors/getRandomErrorMessage';

describe('getRandomErrorMessage', () => {
    const errorMessages = [
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

    test('should return a string', () => {
        const message = getRandomErrorMessage();
        expect(typeof message).toBe('string');
    });

    test('should return a valid error message from the predefined list', () => {
        const message = getRandomErrorMessage();
        expect(errorMessages).toContain(message);
    });

    test('should return different error messages on multiple calls', () => {
        const messages = new Set();
        for (let i = 0; i < 10; i++) {
            messages.add(getRandomErrorMessage());
        }
        expect(messages.size).toBeGreaterThan(1);
    });
});