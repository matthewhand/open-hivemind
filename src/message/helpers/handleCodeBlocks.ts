
/**
 * Handles code blocks within a message, including labels.
 * @param {string} message - The message containing code blocks.
 * @returns {Array<{ label: string | null, content: string }>} Array of objects with labels and code block content.
 */
export function handleCodeBlocks(message: string): Array<{ label: string | null, content: string }> {
    const codeBlockPattern = /```(\w+)?\s*(.*?)```/gs;
    const codeBlocks: Array<{ label: string | null, content: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = codeBlockPattern.exec(message)) !== null) {
        const label = match[1] ? match[1].trim() : null;
        const content = match[2].trim();
        debug.debug(`Found code block with label: ${label || 'none'}`);
        codeBlocks.push({ label, content });
    }

    return codeBlocks;
}
