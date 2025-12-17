import Debug from 'debug';

const debug = Debug('app:LineByLineSender');

/**
 * Check if a line is a bullet point (-, *, •, 1., 2., etc.)
 */
function isBulletPoint(line: string): boolean {
    const trimmed = line.trim();
    // Matches: -, *, •, or numbered lists like 1. 2. etc.
    return /^[-*•](?:\s|$)/.test(trimmed) || /^\d+\.\s/.test(trimmed);
}

/**
 * Split LLM response on newlines and return lines for sequential sending
 * Each line gets sent with typing indicator and delay before the next
 * 
 * Bullet point lists (lines starting with -, *, •, or numbers) are grouped
 * together and sent as a single message for better readability.
 * 
 * @param response - The full LLM response
 * @param preserveEmpty - Whether to preserve empty lines (default: false)
 * @returns Array of non-empty lines to send sequentially
 */
export function splitOnNewlines(response: string, preserveEmpty = false): string[] {
    if (!response) return [];

    // Split on actual newlines OR literal '\n' characters (escaped newlines)
    const rawLines = response.split(/(?:\r\n|\r|\n|\\n)/);

    const lines = preserveEmpty
        ? rawLines
        : rawLines.map(line => line.trim()).filter(line => line.length > 0);

    // Group consecutive bullet points together
    const result: string[] = [];
    let bulletGroup: string[] = [];
    let inBulletList = false;

    for (const line of lines) {
        const isBullet = isBulletPoint(line);

        if (isBullet) {
            if (!inBulletList && bulletGroup.length === 0) {
                // Starting a bullet list - check if previous result item should be included as header
                // Actually, just start collecting bullets
            }
            inBulletList = true;
            bulletGroup.push(line);
        } else {
            // Not a bullet point
            if (inBulletList && bulletGroup.length > 0) {
                // End of bullet list - combine and push
                result.push(bulletGroup.join('\n'));
                bulletGroup = [];
                inBulletList = false;
            }
            result.push(line);
        }
    }

    // Don't forget trailing bullet list
    if (bulletGroup.length > 0) {
        result.push(bulletGroup.join('\n'));
    }

    // Filter out consecutive duplicate lines to prevent LLM stutter loops
    return result.filter((line, i) => i === 0 || line !== result[i - 1]);
}

/**
 * Calculate delay between lines based on line length
 * Longer lines = more "reading time" before next message
 * 
 * @param lineLength - Length of the current line
 * @param baseDelay - Base delay in ms (default: 2000)
 * @returns Delay in milliseconds
 */
export function calculateLineDelay(lineLength: number, baseDelay = 2000): number {
    // Backwards-compatible defaults: ~30ms per character, capped at 8 seconds.
    return calculateLineDelayWithOptions(lineLength, baseDelay);
}

export function calculateLineDelayWithOptions(
    lineLength: number,
    baseDelay = 2000,
    opts?: { perCharMs?: number; maxReadingMs?: number }
): number {
    const safeLen = Math.max(0, Number(lineLength) || 0);
    const safeBase = Math.max(0, Number(baseDelay) || 0);
    const perCharMs = Math.max(0, Number(opts?.perCharMs ?? 30));
    const maxReadingMs = Math.max(0, Number(opts?.maxReadingMs ?? 8000));

    const readingDelay = Math.min(safeLen * perCharMs, maxReadingMs);
    return safeBase + readingDelay;
}

/**
 * Configuration for line-by-line sending mode
 */
export interface LineByLineConfig {
    enabled: boolean;
    baseDelay: number;
    maxLinesPerResponse: number;
}

/**
 * Get default config for line-by-line mode
 */
export function getDefaultLineByLineConfig(): LineByLineConfig {
    return {
        enabled: true, // Default to enabled per user request
        baseDelay: 4000, // 4 second base delay between lines (was 2s)
        maxLinesPerResponse: 5 // Max 5 lines per response to prevent spam
    };
}
