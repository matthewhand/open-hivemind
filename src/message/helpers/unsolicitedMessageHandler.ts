import messageConfig from '@config/messageConfig';

/**
 * Determines whether to reply to an unsolicited message.
 *
 * Design goals:
 * - If MESSAGE_ONLY_WHEN_SPOKEN_TO is enabled (default), only reply when directly addressed.
 * - Otherwise, allow selective unsolicited replies only when the message looks like an
 *   "opportunity" (question/help/request). The actual probability is handled elsewhere.
 * 
 * @param {any} msg - The message object.
 * @param {string} botId - The ID of the bot.
 * @param {string} integration - The name of the integration (e.g., 'discord').
 * @returns {boolean} - Whether to respond or not.
 */
export function shouldReplyToUnsolicitedMessage(msg: any, botId: string, integration: string): boolean {
  const channelId = msg.getChannelId?.();
  const text = String(msg.getText?.() || '').trim();

  const onlyWhenSpokenTo = Boolean(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
  const allowAddressed = Boolean(messageConfig.get('MESSAGE_UNSOLICITED_ADDRESSED'));
  const allowUnaddressed = Boolean(messageConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED'));

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw)
    ? wakewordsRaw
    : String(wakewordsRaw).split(',').map(s => s.trim());

  const isDirectMention =
    (typeof msg.mentionsUsers === 'function' && msg.mentionsUsers(botId)) ||
    (typeof msg.isMentioning === 'function' && msg.isMentioning(botId)) ||
    (typeof msg.getUserMentions === 'function' && (msg.getUserMentions() || []).includes(botId)) ||
    text.toLowerCase().includes(`<@${botId}>`);

  const isReplyToBot =
    (typeof msg.isReplyToBot === 'function' && msg.isReplyToBot()) ||
    ((msg as any)?.metadata?.replyTo?.userId === botId);

  const isWakeword = wakewords.some((word: string) => word && text.toLowerCase().startsWith(String(word).toLowerCase()));

  const isDirectQuery = isDirectMention || isReplyToBot || isWakeword;

  // Extra safety: never reply to other bots unless directly addressed OR explicitly allowed.
  try {
    const isFromBot = typeof msg.isFromBot === 'function' && msg.isFromBot();
    const allowBotToBot = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));

    if (isFromBot && !isDirectQuery) {
      if (!allowBotToBot) {
        return false;
      }
      // If allowed, we bypass "looksLikeOpportunity" for bots to allow conversational flow,
      // relying on the main chance logic (5%) to prevent infinite loops.
      return true;
    }
  } catch { }

  if (onlyWhenSpokenTo) {
    return isDirectQuery;
  }

  // Addressed vs unaddressed (rough heuristic)
  const isAddressedToSomeone =
    (typeof msg.getUserMentions === 'function' && (msg.getUserMentions() || []).length > 0) ||
    /^@\w+/.test(text);

  if (isAddressedToSomeone && !allowAddressed) return false;
  if (!isAddressedToSomeone && !allowUnaddressed) return false;

  return looksLikeOpportunity(text);
}

function looksLikeOpportunity(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;

  // Questions are the most reliable signal.
  if (t.endsWith('?') || t.includes('?')) return true;

  // Common help/request patterns (kept intentionally narrow).
  const patterns = [
    /\bhow do i\b/,
    /\banyone know\b/,
    /\bcan someone\b/,
    /\bhelp\b/,
    /\bwhat is\b/,
    /\bwhy is\b/,
    /\bdoes anyone\b/,
    /\bissue\b/,
    /\berror\b/,
  ];
  return patterns.some((p) => p.test(t));
}
