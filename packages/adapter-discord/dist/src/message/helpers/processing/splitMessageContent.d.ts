/**
 * Splits a message into chunks that are within Discord's character limit,
 * appending an ellipsis to indicate continuation where necessary.
 * @param {string} messageText - The content of the message to be split.
 * @param {number} [maxLength=1997] - The maximum length of each message part.
 * @returns {string[]} An array of message parts, each within the character limit.
 */
export declare function splitMessageContent(messageText: string, maxLength?: number): string[];
//# sourceMappingURL=splitMessageContent.d.ts.map