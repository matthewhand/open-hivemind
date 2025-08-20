/**
 * Summarizes a long message to fit within Discord's message limit.
 * @param message - The message text to summarize.
 * @returns A summarized version of the message.
 */
export async function summarizeMessage(message: string): Promise<string> {
    // Here you would typically use an external API or a custom algorithm to shorten the message.
    // For simplicity, we'll just truncate it to the max allowed length.
    const maxLength = 2000; // Discord's character limit per message.
    return message.length > maxLength ? message.substring(0, maxLength - 3) + '...' : message;
}
