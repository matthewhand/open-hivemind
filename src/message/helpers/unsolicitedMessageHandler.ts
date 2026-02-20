import messageConfig from '@config/messageConfig';
import { getLastBotActivity } from './processing/ChannelActivity';

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
export function shouldReplyToUnsolicitedMessage(
  msg: any,
  botId: string,
  integration: string
): boolean {
  // Logic Refactor: All hard blocks removed.
  // Decisions are now handled by probability modifiers in `shouldReplyToMessage`.
  // We return true to allow the pipeline to proceed to probability calculation.

  // Basic logging of direct queries is still useful for debugging
  const text = String(msg.getText?.() || '').trim();
  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw)
    ? wakewordsRaw
    : String(wakewordsRaw)
        .split(',')
        .map((s) => s.trim());

  const isDirectMention =
    (typeof msg.mentionsUsers === 'function' && msg.mentionsUsers(botId)) ||
    (typeof msg.isMentioning === 'function' && msg.isMentioning(botId)) ||
    (typeof msg.getUserMentions === 'function' && (msg.getUserMentions() || []).includes(botId)) ||
    text.includes(`<@${botId}>`) ||
    text.includes(`<@!${botId}>`);

  const isReplyToBot =
    (typeof msg.isReplyToBot === 'function' && msg.isReplyToBot()) ||
    (msg as any)?.metadata?.replyTo?.userId === botId;

  const isWakeword = wakewords.some(
    (word: string) => word && text.toLowerCase().startsWith(String(word).toLowerCase())
  );

  if (isDirectMention || isReplyToBot || isWakeword) {
    console.debug(
      `📢 DIRECT QUERY | bot: ${botId} | mention: ${isDirectMention} | reply: ${isReplyToBot} | wakeword: ${isWakeword}`
    );
  }

  return true;
}

export function looksLikeOpportunity(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) {
    return false;
  }

  // Questions are the most reliable signal.
  if (t.endsWith('?') || t.includes('?')) {
    return true;
  }

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
