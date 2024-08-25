import debug from './debug';

const errorMessages: string[] = [
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

export function getRandomErrorMessage(): string {
    const randomIndex = Math.floor(Math.random() * errorMessages.length);
    if (randomIndex < 0 || randomIndex >= errorMessages.length) {
        debug('Error selecting a random message: Index out of bounds.');
        return 'An unexpected error occurred.';
    }
    return errorMessages[randomIndex];
}

export function redactSensitiveInfo(key: string, value: any): string {
    if (typeof key !== 'string') {
        debug(`Invalid key type: ${typeof key}. Key must be a string.`);
        return 'Invalid key: [Key must be a string]';
    }

    if (value == null) {
        value = '[Value is null or undefined]';
    } else if (typeof value !== 'string') {
        try {
            value = JSON.stringify(value);
        } catch (error: any) {
            debug(`Error stringifying value: ${error.message}`);
            value = '[Complex value cannot be stringified]';
        }
    }

    const lowerKey = key.toLowerCase();
    const sensitiveKeys = ['password', 'secret', 'apikey', 'access_token', 'auth_token'];
    const sensitivePhrases = ['bearer', 'token'];

    if (sensitiveKeys.includes(lowerKey) || sensitivePhrases.some(phrase => value.includes(phrase))) {
        const redactedPart = value.length > 10 ? value.substring(0, 5) + '...' + value.slice(-5) : '[REDACTED]';
        return `${key}: ${redactedPart}`;
    }

    return `${key}: ${value}`;
}

export function handleError(error: Error, messageChannel: any = null): void {
    debug(`Error Mesage: ${error.message}`);
    debug(`Error Stack Trace: ${error.stack}`);
    if (messageChannel && typeof messageChannel.send === 'function') {
        const errorMsg = getRandomErrorMessage();
        messageChannel.send(errorMsg);
    }
}
