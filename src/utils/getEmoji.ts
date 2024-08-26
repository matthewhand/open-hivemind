import Debug from "debug";
/**
 * Returns a random emoji to be used in user prompts or as a filler.
 * @returns A random emoji as a string.
 */
export function getEmoji(): string {
    const emojis = ['😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}
