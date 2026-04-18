import crypto from 'crypto';

const EMOJIS = [
  '😀',
  '😂',
  '😅',
  '🤣',
  '😊',
  '😍',
  '🤔',
  '😎',
  '😢',
  '😡',
  '👍',
  '👎',
  '👌',
  '🙏',
  '💪',
  '🔥',
];

/**
 * Returns an emoji based on a keyword or a random one if no keyword provided.
 * @param keyword Optional keyword to get a specific emoji
 * @returns An emoji string
 */
export function getEmoji(keyword?: string): string {
  if (keyword) {
    const k = keyword.toLowerCase();
    if (k.includes('success')) return '✅';
    if (k.includes('error')) return '❌';
    if (k.includes('warning')) return '⚠️';
    return '🤖'; // Default for unknown keywords
  }

  const randomBytes = crypto.randomBytes(4);
  const index = randomBytes.readUInt32BE() % EMOJIS.length;
  return EMOJIS[index];
}
