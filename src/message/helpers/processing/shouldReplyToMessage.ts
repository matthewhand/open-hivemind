import messageConfig from '@config/messageConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage, looksLikeOpportunity } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';
import { getLastBotActivity } from './ChannelActivity';
import { isBotNameInText } from './MentionDetector';
import { isOnTopic } from './SemanticRelevanceChecker';

const debug = Debug('app:shouldReplyToMessage');

export interface ReplyDecision {
  shouldReply: boolean;
  reason: string;
  meta?: Record<string, any>;
}

export async function shouldReplyToMessage(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  botNameOrNames?: string | string[],
  historyMessages?: any[],
  defaultChannelId?: string
): Promise<ReplyDecision> {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return { shouldReply: true, reason: 'FORCE_REPLY env var enabled' };
  }

  const channelId = message.getChannelId();
  debug(`Evaluating message in channel: ${channelId}`);

  const onlyWhenSpokenTo = Boolean(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO'));
  const rawText = String(message.getText?.() || '');
  const text = rawText.toLowerCase();

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw)
    ? wakewordsRaw
    : String(wakewordsRaw).split(',').map(s => s.trim());

  const isDirectMention =
    (typeof message.mentionsUsers === 'function' && message.mentionsUsers(botId)) ||
    (typeof message.isMentioning === 'function' && message.isMentioning(botId)) ||
    (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).includes(botId)) ||
    text.includes(`<@${botId}>`) ||
    text.includes(`<@!${botId}>`);

  const isReplyToBot =
    (typeof message.isReplyToBot === 'function' && Boolean(message.isReplyToBot())) ||
    ((message as any)?.metadata?.replyTo?.userId === botId);

  const replyToId = (message as any)?.metadata?.replyTo?.userId;
  const isReplyToOther = replyToId && replyToId !== botId;

  const isWakeword = wakewords.some((word: string) => word && text.startsWith(String(word).toLowerCase()));

  const namesRaw = Array.isArray(botNameOrNames) ? botNameOrNames : [botNameOrNames].filter(Boolean);
  const nameCandidates = Array.from(new Set(
    namesRaw
      .flatMap((n) => {
        const name = String(n || '').trim();
        if (!name) return [];
        // Filter out generic names like "Bot" or "Assistant" if we have other more specific names.
        const genericNames = ['bot', 'assistant'];
        if (genericNames.includes(name.toLowerCase()) && namesRaw.length > 1) {
          return [];
        }
        const base = name.replace(/\s*#\d+\s*$/i, '').trim();
        return base && base !== name ? [name, base] : [name];
      })
      .filter(Boolean)
  ));
  const isNameAddressed = nameCandidates.some((n) => isBotNameInText(rawText, n));
  const isDM = typeof message.isDirectMessage === 'function' && message.isDirectMessage();
  const isDirectlyAddressed = isDirectMention || isReplyToBot || isWakeword || isNameAddressed || isDM;

  const isFromBot = (() => {
    try {
      return typeof message.isFromBot === 'function' ? Boolean(message.isFromBot()) : false;
    } catch {
      return false;
    }
  })();

  // Never respond to our own messages
  try {
    if (typeof message.getAuthorId === 'function' && message.getAuthorId() === botId) {
      debug('Message from bot itself. Not replying.');
      return { shouldReply: false, reason: 'Message from self' };
    }
  } catch { }

  // 1. Global Ignore Bots
  if (isFromBot) {
    const ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
    if (ignoreBots) {
      return { shouldReply: false, reason: 'Bots ignored via config' };
    }
    const limitToDefault = Boolean(messageConfig.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL'));
    if (limitToDefault && defaultChannelId && channelId !== defaultChannelId) {
      return { shouldReply: false, reason: 'Bot replies limited to default channel' };
    }
  }

  // If configured to only respond when spoken to, check grace window
  if (onlyWhenSpokenTo && !isDirectlyAddressed) {
    const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
    const lastActivityTime = graceMs > 0 ? getLastBotActivity(channelId, botId) : 0;
    const timeSinceLastActivity = lastActivityTime > 0 ? Math.max(0, Date.now() - lastActivityTime) : Infinity;

    if (!(graceMs > 0 && lastActivityTime > 0 && timeSinceLastActivity <= graceMs)) {
      debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and not addressed, no grace; not replying.');
      return {
        shouldReply: false,
        reason: 'Not addressed (OnlyWhenSpokenTo)',
        meta: { mods: 'none', last: lastActivityTime > 0 ? `${Math.round(timeSinceLastActivity / 1000)}s` : 'never' }
      };
    }
  }

  // Safety by default: avoid bot-to-bot loops unless explicitly allowed.
  if (isFromBot && !isDirectlyAddressed) {
    const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
    const lastActivityTime = graceMs > 0 ? getLastBotActivity(channelId, botId) : 0;
    const timeSinceLastActivity = lastActivityTime > 0 ? Math.max(0, (Date.now() - lastActivityTime)) : Infinity;
    const withinGrace = graceMs > 0 && lastActivityTime > 0 && timeSinceLastActivity <= graceMs;

    const allowUnaddressedBots = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
    if (!allowUnaddressedBots && !withinGrace) {
      return { shouldReply: false, reason: 'Unaddressed bot message disabled' };
    }
  }

  // If directly addressed (mention, reply, wakeword, DM, or name), always reply.
  // This bypasses unsolicited gating and probability rolls.
  if (isDirectlyAddressed) {
    return { shouldReply: true, reason: 'Directly addressed', meta: { mods: '+Mention(+1.0)' } };
  }

  // Track participation/density for probabilistic throttling.
  const authorId = (() => {
    try {
      return typeof message.getAuthorId === 'function' ? String(message.getAuthorId()) : undefined;
    } catch { return undefined; }
  })();
  let density: IncomingMessageDensity | null = null;
  try {
    density = IncomingMessageDensity.getInstance();
    if (typeof (density as any).recordMessage === 'function') {
      (density as any).recordMessage(channelId, authorId, isFromBot);
    }
  } catch { }

  // Analyze history for penalties
  const recentHistory = historyMessages ? historyMessages.slice(-15) : [];
  const uniqueUsers = new Set<string>();
  const uniqueBots = new Set<string>();
  let botHistoryCount = 0;
  let selfTokenCount = 0;

  for (const msg of recentHistory) {
    try {
      const aid = msg.getAuthorId?.() || 'unknown';
      const isBot = msg.isFromBot?.() || false;
      if (aid === botId) {
        botHistoryCount++;
        const content = msg.getText?.() || '';
        selfTokenCount += Math.ceil(content.length / 4);
      } else if (isBot) {
        uniqueBots.add(aid);
      } else {
        uniqueUsers.add(aid);
      }
    } catch { }
  }
  if (authorId && authorId !== botId) {
    if (isFromBot) uniqueBots.add(authorId);
    else uniqueUsers.add(authorId);
  }

  const botHistoryPenalty = Math.max(-0.5, (botHistoryCount - 1) * 0.10 * -1);
  const tokenDensityPenalty = Math.max(0, selfTokenCount * 0.0001) * -1;
  const userCountPenalty = uniqueUsers.size > 1 ? (Math.max(0, (uniqueUsers.size - 1) * 0.02) * -1) : 0;

  // Unsolicited handler gating
  if (!isDirectlyAddressed) {
    try {
      if (!shouldReplyToUnsolicitedMessage(message, botId, platform)) {
        const lastActivity = getLastBotActivity(channelId, botId);
        const lastStr = lastActivity > 0 ? `${Math.round((Date.now() - lastActivity) / 1000)}s` : 'never';
        return {
          shouldReply: false,
          reason: 'Unsolicited handler rejected (inactive channel)',
          meta: { mods: 'none', last: lastStr }
        };
      }
    } catch (err) {
      debug('Error in unsolicited message handler; not replying:', err);
      return { shouldReply: false, reason: 'Unsolicited handler error', meta: { error: String(err) } };
    }
  }

  const mods: string[] = [];
  let lastPostTime = getLastBotActivity(channelId, botId);
  const SILENCE_THRESHOLD = Number(messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS')) || (5 * 60 * 1000);

  if (historyMessages && historyMessages.length > 0) {
    for (let i = historyMessages.length - 1; i >= 0; i--) {
      const m = historyMessages[i];
      if (m.authorId === botId) {
        const timestamp = (m as any).timestamp || (m as any).createdAt || 0;
        if (timestamp > 0) {
          lastPostTime = Math.max(lastPostTime, timestamp instanceof Date ? timestamp.getTime() : timestamp);
          break;
        }
      }
    }
  }

  const timeSinceLastActivity = lastPostTime > 0 ? Math.max(0, Date.now() - lastPostTime) : Infinity;
  const hasPostedRecently = timeSinceLastActivity < SILENCE_THRESHOLD;
  const lastStr = lastPostTime > 0 ? `${Math.floor(timeSinceLastActivity / 1000)}s ago` : 'never';

  let chance = 0.0;
  const baseChanceRaw = messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE');
  if (typeof baseChanceRaw === 'number') chance = baseChanceRaw;
  else if (typeof baseChanceRaw === 'string' && baseChanceRaw.trim() !== '') chance = Number(baseChanceRaw);

  const baseChance = chance;
  mods.push(`Base(${baseChance.toFixed(2)} @ ${lastStr})`);

  if (hasPostedRecently) {
    const minutesElapsed = timeSinceLastActivity / 60000;
    const recentBonus = 0.5 / (1 + minutesElapsed);
    chance += recentBonus;
    mods.push(`+Recent(+${recentBonus.toFixed(2)})`);
  } else {
    const windowRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS');
    const windowMs = typeof windowRaw === 'number' ? windowRaw : Number(windowRaw) || (5 * 60 * 1000);
    let participants = 1;
    try {
      if (density && typeof (density as any).getUniqueParticipantCount === 'function') {
        participants = (density as any).getUniqueParticipantCount(channelId, windowMs);
      }
    } catch { }
    participants = Math.max(1, participants);
    const participantPenalty = Math.max(0, (participants - 2)) * 0.05 * -1;
    if (participantPenalty !== 0) {
      chance += participantPenalty;
      mods.push(`-Participants(${participantPenalty.toFixed(2)})`);
    }
  }

  if (botHistoryPenalty < 0) {
    chance += botHistoryPenalty;
    mods.push(`BotHistory(${botHistoryPenalty.toFixed(2)})`);
  }
  if (userCountPenalty < 0) {
    chance += userCountPenalty;
    mods.push(`UserCount(${userCountPenalty.toFixed(2)})`);
  }
  if (tokenDensityPenalty < 0) {
    chance += tokenDensityPenalty;
    mods.push(`TokenDensity(${tokenDensityPenalty.toFixed(2)})`);
  }

  // Prevent bot-to-bot storms when the room is only bots *and* we haven't been active recently.
  // If we have been active recently (grace window), keep "floodgates" behavior and do not hard-penalize.
  const botRatioPenalty = (!hasPostedRecently && uniqueBots.size > 0 && uniqueUsers.size === 0) ? -0.5 : 0;
  chance += botRatioPenalty;
  mods.push(`BotRatio(${botRatioPenalty >= 0 ? '+' : ''}${botRatioPenalty.toFixed(2)})`);

  if (hasPostedRecently && historyMessages && historyMessages.length > 0) {
    try {
      const recentContext = historyMessages.slice(-5).map((m: any) => `${m.getAuthorId?.() || 'unknown'}: ${m.getText?.() || ''}`).join('\n');
      const newMessage = message.getText?.() || '';
      if (await isOnTopic(recentContext, newMessage)) {
        chance += 0.3;
        mods.push('+OnTopic(+0.3)');
      } else {
        chance -= 0.1;
        mods.push('-OffTopic(-0.1)');
      }
    } catch { }
  }

  const isAddressedToSomeone = (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).length > 0) || /^@\w+/.test(text) || isReplyToOther;
  if (isAddressedToSomeone && !isDirectlyAddressed) {
    chance -= 0.5;
    mods.push(`AddressedToOther(-0.50)`);
  }

  // Calculate Leading Address
  let isLeadingAddress = false;
  if (isDirectlyAddressed) {
    const myPatterns: RegExp[] = [
      new RegExp(`<@!?${botId}>`, 'i'),
      ...nameCandidates.map(n => new RegExp(`${escapeRegExp(n)}\\b`, 'i'))
    ];
    let firstMatchIndex = Infinity;
    for (const pat of myPatterns) {
      const m = text.match(pat);
      if (m && m.index !== undefined && m.index < firstMatchIndex) firstMatchIndex = m.index;
    }
    if (firstMatchIndex !== Infinity) {
      let preceding = text.substring(0, firstMatchIndex).replace(/<(@|!|#|&|a:)[^>]+>/g, '');
      isLeadingAddress = !/[a-z0-9]/.test(preceding);
    } else if (isWakeword) {
      isLeadingAddress = true;
    }
  }

  const modResult = applyModifiers(message, botId, platform, chance, (isDirectMention || isWakeword || isNameAddressed || isDM), isLeadingAddress, isReplyToBot);
  chance = modResult.chance;

  try {
    if (density && typeof (density as any).getDensity === 'function') {
      const { total } = (density as any).getDensity(channelId);
      const burstPenalty = Math.max(-0.5, (total - 1) * 0.10 * -1);
      if (burstPenalty !== 0) {
        chance += burstPenalty;
        mods.push(`BurstTraffic(${burstPenalty.toFixed(2)})`);
      }

      // Quiet Channel Bonus (5 min window)
      const quietWindow = 300000;
      const { total: total5m } = (density as any).getDensity(channelId, quietWindow);
      const quietBonus = 0.20 * Math.max(0, 1 - (total5m / 5));
      if (quietBonus > 0) {
        chance += quietBonus;
        mods.push(`+QuietChannel(+${quietBonus.toFixed(2)})`);
      }
    }
  } catch { }

  const allMods = [...mods, modResult.modifiers !== 'none' ? modResult.modifiers : ''].filter(Boolean).join('') || 'none';
  chance = Math.max(0, Math.min(1, chance));
  const roll = Math.random();
  let decision = roll < chance;

  if (isDirectlyAddressed) {
    decision = true;
  }

  return {
    shouldReply: decision,
    reason: isDirectlyAddressed ? 'Directly addressed' : (decision ? 'Chance roll success' : 'Chance roll failure'),
    meta: {
      probability: `<${Number(chance.toPrecision(3))}`,
      rolled: Number(roll.toPrecision(3)),
      mods: allMods
    }
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyModifiers(
  message: any,
  botId: string,
  platform: 'discord' | 'generic',
  chance: number,
  isDirectlyAddressed: boolean = false,
  isLeadingAddress: boolean = false,
  isReplyToBot: boolean = false
): { chance: number; modifiers: string } {
  const text = (message.getText?.() || '').toLowerCase();
  const mods: string[] = [];
  if (isDirectlyAddressed) {
    chance += 0.5;
    mods.push('+Mention(+0.5)');
    if (isLeadingAddress) {
      chance += 1.0;
      mods.push('+Leading(+1.0)');
    }
  }
  if (isReplyToBot) {
    chance += 0.5;
    mods.push('+Reply(+0.5)');
  }
  if (text.includes('?')) {
    chance += 0.2;
    mods.push('+Q(+0.2)');
  }
  if (text.includes('!')) {
    chance += 0.1;
    mods.push('+!(+0.1)');
  }
  if (text.length < 10) {
    const penalty = Number(messageConfig.get('MESSAGE_SHORT_LENGTH_PENALTY')) || 0;
    if (penalty > 0) {
      chance -= penalty;
      mods.push(`-Short(${penalty})`);
    }
  }
  if (typeof message.isFromBot === 'function' && message.isFromBot()) {
    const botModifier = Number(messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER')) || -0.1;
    chance += botModifier;
    mods.push(`${botModifier >= 0 ? '+' : ''}BotResponse(${botModifier})`);
  }

  const channelBonuses: Record<string, number> = (messageConfig.get as any)('CHANNEL_BONUSES') || {};
  const channelBonus = typeof channelBonuses?.[message.getChannelId()] === 'number' ? channelBonuses[message.getChannelId()] : 1.0;
  if (channelBonus !== 1.0) {
    const additiveBonus = channelBonus - 1.0;
    chance += additiveBonus;
    mods.push(`Chan(${additiveBonus >= 0 ? '+' : ''}${additiveBonus.toFixed(2)})`);
  }
  return { chance, modifiers: mods.join('') || 'none' };
}
