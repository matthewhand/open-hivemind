"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmoji = getEmoji;
/**
 * Returns a random emoji to be used in user prompts or as a filler.
 * @returns A random emoji as a string.
 */
function getEmoji() {
    const emojis = ['😀', '😂', '😅', '🤣', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '👌', '🙏', '💪', '🔥'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}
