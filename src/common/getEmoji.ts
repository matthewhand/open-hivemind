const EMOJIS = ['😀','😂','😅','🤣','😊','😍','🤔','😎','😢','😡','👍','👎','👌','🙏','💪','🔥'];

export function getEmoji(): string {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}
