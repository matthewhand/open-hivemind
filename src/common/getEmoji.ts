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

export function getEmoji(): string {
  const randomBytes = crypto.randomBytes(4);
  const index = randomBytes.readUInt32BE() % EMOJIS.length;
  return EMOJIS[index];
}
