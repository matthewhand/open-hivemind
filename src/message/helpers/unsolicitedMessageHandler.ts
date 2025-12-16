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

  // Diagnostic: Log mention detection
  const userMentions = typeof msg.getUserMentions === 'function' ? msg.getUserMentions() : [];
  console.debug(`🔍 MENTION-CHECK | botId: ${botId} | mentions: [${userMentions?.join(', ')}] | text contains <@${botId}>: ${text.includes(`<@${botId}>`)} | isDirectMention: ${isDirectMention} | isDirectQuery: ${isDirectQuery}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Bot-to-Bot Logic (MUST COME BEFORE onlyWhenSpokenTo check)
  // ─────────────────────────────────────────────────────────────────────────
  // When MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED=true, bot messages bypass all
  // other checks (including onlyWhenSpokenTo) to enable multi-bot conversations.
  try {
    const hasIsFromBot = typeof msg.isFromBot === 'function';
    const isFromBot = hasIsFromBot && msg.isFromBot();
    const allowBotToBot = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));

    // Diagnostic logging
    console.debug(`🔍 BOT-CHECK | hasIsFromBot: ${hasIsFromBot}, isFromBot: ${isFromBot}, allowBotToBot: ${allowBotToBot}, isDirectQuery: ${isDirectQuery}`);

    if (isFromBot) {
      if (isDirectQuery) {
        // Bot directly addressed us - always reply
        console.info(`🤖 BOT-TO-BOT | Bot directly addressed us - allowing`);
        return true;
      }
      if (allowBotToBot) {
        // Bot message + bot-to-bot enabled → bypass all other checks
        console.info(`🤖 BOT-TO-BOT | Allowing unaddressed bot message (MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED=true)`);
        return true;
      }
      // Bot message but bot-to-bot disabled → reject
      console.info(`🤖 BOT-TO-BOT | Rejecting - bot-to-bot is disabled`);
      return false;
    }
  } catch (err) {
    console.warn(`🔍 BOT-CHECK | Error in bot detection:`, err);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Human Message Checks
  // ─────────────────────────────────────────────────────────────────────────

  // Import activity tracker to check if bot was recently active
  const { getLastBotActivity } = require('../handler/ChannelActivity');
  const GRACE_WINDOW_MS = Number(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS')) || (5 * 60 * 1000);
  const lastActivity = channelId ? getLastBotActivity(channelId, botId) : 0;
  const timeSinceActivity = lastActivity > 0 ? (Date.now() - lastActivity) : Number.POSITIVE_INFINITY;
  const withinGraceWindow = timeSinceActivity <= GRACE_WINDOW_MS;

  if (onlyWhenSpokenTo) {
    if (isDirectQuery) {
      return true;
    }
    // If bot was recently active in this channel, allow continued conversation
    if (withinGraceWindow) {
      console.info(`🔥 GRACE WINDOW | Bot active ${(timeSinceActivity / 1000).toFixed(0)}s ago - bypassing onlyWhenSpokenTo`);
      // Fall through to opportunity check below
    } else {
      console.debug(`💤 NO GRACE | Bot last active ${(timeSinceActivity / 1000).toFixed(0)}s ago - requiring direct address`);
      return false;
    }
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
