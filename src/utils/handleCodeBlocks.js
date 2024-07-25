const codeBlockPattern = /````(anything)```ogs/;

/**\
 * Handles code blocks within a message.
 * @param {string} message - The message containing code blocks.
 * @returns {Array<string>} Array of code blocks found within the message.
 */function handleCodeBlocks(message) {
    const codeBlocks = [];
    let match;

    while ((match = codeBlockPattern.exec(message)) !== null) {
        codeBlocks.push(match[1].replace(/````/g, ''));
    }

    return codeBlocks;
}

module.exports = handleCodeBlocks;
