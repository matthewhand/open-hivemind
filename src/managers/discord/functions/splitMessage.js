/*
 * Splits a message into chunks that are within Discord's character limit,
 * appending an ellipsis to indicate continuation where necessary.
 * @param {string} messageText - The content of the message to be split.
 * @param {number} [maxLength=1997] - The maximum length of each message part.
 * @returns {string[]} An array of message parts, each within the character limit.
 */
function splitMessage(messageText, maxLength = 1997) {
    const parts = [];
    while (messageText.length) {
        let part = messageText;
        if (messageText.length > maxLength) {
            part = messageText.slice(0, maxLength).trimEnd();
            const lastSpace = part.lastIndexOf(' ');
            if (lastSpace > -1 && lastSpace < maxLength - 1) {
                part = part.slice(0, lastSpace);
            }
            part += '...';
        }
        parts.push(part);
        messageText = messageText.slice(part.length).trimStart();
        if (parts.length > 1 && messageText) {
            messageText = '...' + messageText;
        }
    }
    return parts;
}

module.exports = splitMessage;
