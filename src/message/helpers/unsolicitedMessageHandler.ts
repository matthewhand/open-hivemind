import messageConfig from '@config/messageConfig';
import { getLastBotActivity } from './processing/ChannelActivity';

/**
 * Determines whether to reply to an unsolicited message.
 *
 * Design goals:
 * - If MESSAGE_ONLY_WHEN_SPOKEN_TO is enabled (default), only reply when directly addressed.
 * - Otherwise, allow selective unsolicited replies only when the bot has been recently active
 *   in the channel and the message looks like an "opportunity" (question/help/request).
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
  const activityWindowMs = Number(messageConfig.get('MESSAGE_ACTIVITY_TIME_WINDOW')) || (5 * 60 * 1000);

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

  // Extra safety: never reply to other bots unless directly addressed.
  try {
    if (typeof msg.isFromBot === 'function' && msg.isFromBot() && !isDirectQuery) {
      return false;
    }
  } catch { }

  if (onlyWhenSpokenTo) {
    return isDirectQuery;
  }

  // If not directly addressed, only consider responding when the bot has been recently active.
  const lastBotActivity = channelId ? getLastBotActivity(channelId) : 0;
  const recentlyActive = Boolean(lastBotActivity) && (Date.now() - lastBotActivity) <= activityWindowMs;
  if (!recentlyActive) {
    return false;
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
