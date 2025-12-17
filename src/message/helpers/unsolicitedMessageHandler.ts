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
    text.includes(`<@${botId}>`) ||
    text.includes(`<@!${botId}>`);  // Discord nickname mention format

  const isReplyToBot =
    (typeof msg.isReplyToBot === 'function' && msg.isReplyToBot()) ||
    ((msg as any)?.metadata?.replyTo?.userId === botId);

  const isWakeword = wakewords.some((word: string) => word && text.toLowerCase().startsWith(String(word).toLowerCase()));

  const isDirectQuery = isDirectMention || isReplyToBot || isWakeword;

  // Debug: Log if direct query detected
  if (isDirectQuery) {
    console.info(`📢 DIRECT | bot: ${botId} | mention: ${isDirectMention} | reply: ${isReplyToBot} | wakeword: ${isWakeword}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bot-to-Bot Logic (MUST COME BEFORE onlyWhenSpokenTo check)
  // ─────────────────────────────────────────────────────────────────────────
  // When MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED=true, bot messages bypass all
  // other checks (including onlyWhenSpokenTo) to enable multi-bot conversations.
  try {
    const hasIsFromBot = typeof msg.isFromBot === 'function';
    const isFromBot = hasIsFromBot && msg.isFromBot();
    const allowBotToBot = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));

    if (isFromBot) {
      if (isDirectQuery) {
        console.info(`🤖 BOT | from bot, directly addressed → allowing`);
        return true;
      }
      if (allowBotToBot) {
        console.info(`🤖 BOT | from bot, unaddressed, allowBotToBot=true → allowing`);
        return true;
      }
      console.info(`🤖 BOT | from bot, unaddressed, allowBotToBot=false → rejecting`);
      return false;
    }
  } catch (err) {
    console.warn(`🤖 BOT | Error in detection:`, err);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Human Message Checks
  // ─────────────────────────────────────────────────────────────────────────

  // Check if bot was recently active (reuse channelId from line 17)
  const GRACE_WINDOW_MS = Number(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS')) || (5 * 60 * 1000);
  // Use channel-wide activity (no botId) - if ANY bot posted recently, allow grace window
  const lastActivity = channelId ? getLastBotActivity(channelId) : 0;
  const timeSinceActivity = lastActivity > 0 ? (Date.now() - lastActivity) : Number.POSITIVE_INFINITY;
  const withinGraceWindow = timeSinceActivity <= GRACE_WINDOW_MS;

  if (onlyWhenSpokenTo) {
    if (isDirectQuery) {
      return true;
    }
    // If bot was recently active in this channel, allow continued conversation
    if (withinGraceWindow) {
      console.info(`🔥 GRACE | channel: ${channelId} | active ${(timeSinceActivity / 1000).toFixed(0)}s ago → bypassing onlyWhenSpokenTo`);
      // Fall through to opportunity check below
    } else {
      console.info(`💤 NO GRACE | channel: ${channelId} | last active ${(timeSinceActivity / 1000).toFixed(0)}s ago → requiring direct address`);
      return false;
    }
  }

  // Direct mentions to THIS bot should always respond (regardless of onlyWhenSpokenTo setting)
  if (isDirectQuery) {
    console.info(`📢 DIRECT QUERY | bot: ${botId} → allowing`);
    return true;
  }

  // Addressed vs unaddressed (rough heuristic for messages addressed to OTHER users)
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
