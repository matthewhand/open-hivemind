const logger = require('./logger');

/**
 * List of whimsical error messages used across the application.
 * @type {string[]}
 */
const errorMessages = [
    "Oops, my circuits got tangled in digital spaghetti! 🍝🤖",
    "Whoa, I tripped over a virtual shoelace! 🤖👟",
    "Ah, I just had a byte-sized hiccup! 🤖🍔",
    "Looks like I bumbled the binary! 💾🐝",
    "Yikes, my code caught a digital cold! 🤖🤧",
    "Gosh, I stumbled into a loop hole! 🌀🤖",
    "Oopsie, I accidentally swapped my bits with bytes! 🔄🤖",
    "My gears are in a jam, quite a pickle indeed! 🤖🥒",
    "Uh-oh, I spilled some pixels here! 🤖🎨",
    "Hold on, recalibrating my humor sensors! 🤖😂",
];

/**
 * Retrieves a random error message from the predefined list.
 * @returns {string} A randomly selected, whimsical error message.
 */
function getRandomErrorMessage() {
    const randomIndex = Math.floor(Math.random() * errorMessages.length);
    if (randomIndex < 0 || randomIndex >= errorMessages.length) {
        logger.error("Error selecting a random message: Index out of bounds.");
        return "An unexpected error occurred."; // Fallback error message
    }
    return errorMessages[randomIndex];
}

/**
 * Redacts sensitive information from a string based on the associated key, focusing on keys
 * commonly used for sensitive data like passwords, API keys, and authorization tokens.
 *
 * @param {string} key - The key potentially associated with sensitive data.
 * @param {string} value - The value corresponding to the key which might need redaction.
 * @returns {string} The redacted or original value, depending on the sensitivity of the key.
 */
function redactSensitiveInfo(key, value) {
    // Validate input types
    if (typeof key !== 'string') {
        console.error(`Invalid key type: ${typeof key}. Key must be a string.`);
        return 'Invalid key: [Key must be a string]';
    }
    
    // Convert any non-string value to a string (except for undefined or null)
    if (value == null) {  // Loose equality to catch both undefined and null
        value = '[Value is null or undefined]';
    } else if (typeof value !== 'string') {
        try {
            value = JSON.stringify(value);
        } catch (error) {
            console.error(`Error stringifying value: ${error.message}`);
            value = '[Complex value cannot be stringified]';
        }
    }

    // Define sensitive information criteria
    const lowerKey = key.toLowerCase();
    const sensitiveKeys = ['password', 'secret', 'apikey', 'access_token', 'auth_token'];
    const sensitivePhrases = ['bearer', 'token'];

    // Check if the key or value contains sensitive information
    if (sensitiveKeys.includes(lowerKey) || sensitivePhrases.some(phrase => value.includes(phrase))) {
        const redactedPart = value.length > 10 ? `${value.substring(0, 5)}...${value.slice(-5)}` : '[REDACTED]';
        return `${key}: ${redactedPart}`;
    }

    return `${key}: ${value}`;
}

/**
 * Logs an error message and its stack trace to the console. Optionally sends a whimsical error message as a response in a messaging context.
 * @param {Error} error - The error object to be logged and handled.
 * @param {any} [messageChannel=null] - Optional. The channel to send a response message to, if provided.
 */
function handleError(error, messageChannel = null) {
    logger.error(`Error Mesage: ${error.message}`);
    logger.error(`Error Stack Trace: ${error.stack}`);
    if (messageChannel && typeof messageChannel.send === 'function') {
        const errorMsg = getRandomErrorMessage();
        messageChannel.send(errorMsg);  // Send the whimsical error message to the channel
    }
}

module.exports = {
    redactSensitiveInfo,
    getRandomErrorMessage,
    handleError
};
