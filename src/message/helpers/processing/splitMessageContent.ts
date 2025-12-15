/**
 * Splits a message into chunks that are within Discord's character limit,
 * appending an ellipsis to indicate continuation where necessary.
 * @param {string} messageText - The content of the message to be split.
 * @param {number} [maxLength=1997] - The maximum length of each message part.
 * @returns {string[]} An array of message parts, each within the character limit.
 */
export function splitMessageContent(messageText: string, maxLength = 1997): string[] {
    const parts: string[] = [];
    let chunkStartIndex = 0;

    // Minimum required length to accommodate ellipses "..." (3) + content (1) + "..." (3) = 7
    // But practically we can handle "..." + 1 char. = 4. 
    if (maxLength < 10) maxLength = 10; // Enforce sanity lower bound

    while (chunkStartIndex < messageText.length) {
        const isFirstPart = (parts.length === 0);

        // Calculate max content we can fit in this part
        // Base is maxLength.
        // Subtract 3 for leading '...' if not first part.
        let availableSpace = maxLength;
        if (!isFirstPart) availableSpace -= 3;

        const remainingLength = messageText.length - chunkStartIndex;

        if (remainingLength <= availableSpace) {
            // The rest fits
            let chunk = messageText.slice(chunkStartIndex);
            if (!isFirstPart) chunk = '...' + chunk;
            parts.push(chunk);
            break;
        }

        // Doesn't fit, need to split.
        // Must reserve 3 chars for trailing '...'
        let contentQuota = availableSpace - 3;

        // Candidate slice
        let chunkContent = messageText.slice(chunkStartIndex, chunkStartIndex + contentQuota).trimEnd();

        // Try to break at space if possible
        const lastSpace = chunkContent.lastIndexOf(' ');
        if (lastSpace > (chunkContent.length * 0.5)) {
            chunkContent = chunkContent.slice(0, lastSpace);
        }

        // Ensure we make progress
        if (chunkContent.length === 0) {
            // Force take one char if we got stuck (e.g. huge unbroken string or logic edge case)
            chunkContent = messageText.slice(chunkStartIndex, chunkStartIndex + contentQuota); // Retake without trim
            if (chunkContent.length === 0) {
                chunkContent = messageText.slice(chunkStartIndex, chunkStartIndex + 1);
            }
        }

        const actualConsumedLength = chunkContent.length; // From the slice we took, spaces inside are consumed. 
        // Wait, if we 'broke at space' logic:
        // "abc def" -> break at space -> "abc". 
        // We consumed "abc". 
        // chunkStartIndex += 3.
        // Next loop starts at " def". trimStart at next loop handles it?
        // My previous logic had manual whitespace skip.

        // Construct part
        let finalPart = chunkContent + '...';
        if (!isFirstPart) finalPart = '...' + finalPart;
        parts.push(finalPart);

        // Advance
        chunkStartIndex += actualConsumedLength;

        // Skip subsequent whitespace to start clean
        while (chunkStartIndex < messageText.length && /\s/.test(messageText[chunkStartIndex])) {
            chunkStartIndex++;
        }
    }
    return parts;
}
