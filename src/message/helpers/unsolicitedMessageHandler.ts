import messageConfig from '@config/messageConfig';
import { Logger } from '@common/logger';

const logger = Logger.withContext('unsolicitedMessageHandler');

/**
 * Determines whether to reply to an unsolicited message.
 *
 * Design goals:
 * - If MESSAGE_ONLY_WHEN_SPOKEN_TO is enabled (default), only reply when directly addressed.
 *   (That gate lives in `shouldReplyToMessage`; this helper is only reached for messages that
 *   are NOT directly addressed.)
 * - When MESSAGE_UNSOLICITED_REQUIRE_OPPORTUNITY is enabled, restrict unsolicited replies to
 *   messages that look like an "opportunity" (question/help/request) via `looksLikeOpportunity`.
 *   The actual reply probability is still handled downstream.
 * - When that flag is disabled (the default), preserve the existing behaviour of allowing the
 *   pipeline to proceed to probability calculation for every unsolicited message.
 *
 * @param {any} msg - The message object.
 * @param {string} botId - The ID of the bot.
 * @param {string} integration - The name of the integration (e.g., 'discord').
 * @returns {boolean} - Whether to respond or not.
 */
export function shouldReplyToUnsolicitedMessage(
  msg: any,
  botId: string,
  _integration: string
): boolean {
  // Decisions are primarily handled by probability modifiers in `shouldReplyToMessage`.
  // Optionally, a configurable hard gate restricts unsolicited replies to "opportunities".

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

  const isDirectQuery = isDirectMention || isReplyToBot || isWakeword;
  if (isDirectQuery) {
    logger.debug('Direct query detected', {
      botId,
      isDirectMention,
      isReplyToBot,
      isWakeword,
    });
  }

  // Configurable hard gate: when enabled, only allow unsolicited replies for messages
  // that look like an opportunity (or that are themselves a direct query). Defaults to
  // false so existing deployments keep deferring the decision to probability modifiers.
  const requireOpportunity = Boolean(messageConfig.get('MESSAGE_UNSOLICITED_REQUIRE_OPPORTUNITY'));
  if (requireOpportunity && !isDirectQuery && !looksLikeOpportunity(text)) {
    logger.debug('Unsolicited message does not look like an opportunity; gating reply', {
      botId,
    });
    return false;
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
    /\bwhy is\b/, // Match "why is" questions (with or without ?)
    /\bdoes anyone\b/,
    /\bissue\b/,
    /\berror\b/,
  ];
  return patterns.some((p) => p.test(t));
}
