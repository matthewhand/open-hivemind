import messageConfig from '@config/messageConfig';
import Debug from 'debug';
import { shouldReplyToUnsolicitedMessage, looksLikeOpportunity } from '../unsolicitedMessageHandler';

import { IncomingMessageDensity } from './IncomingMessageDensity';
import { getLastBotActivity } from './ChannelActivity';
import { GlobalActivityTracker } from './GlobalActivityTracker';

import { isBotNameInText } from './MentionDetector';
import { isOnTopic } from './SemanticRelevanceChecker';
import TypingMonitor from '../monitoring/TypingMonitor';
import { getMessageSetting } from './ResponseProfile';

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
  defaultChannelId?: string,
  botConfig?: Record<string, any>
): Promise<ReplyDecision> {
  if (process.env.FORCE_REPLY && process.env.FORCE_REPLY.toLowerCase() === 'true') {
    debug('FORCE_REPLY env var enabled. Forcing reply.');
    return { shouldReply: true, reason: 'FORCE_REPLY env var enabled' };
  }

  const channelId = message.getChannelId();
  debug(`Evaluating message in channel: ${channelId}`);

  const onlyWhenSpokenTo = Boolean(getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO', botConfig));
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
    const graceMsRaw = getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', botConfig);
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
    const graceMsRaw = getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', botConfig);
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
    const lastActivityTime = graceMs > 0 ? getLastBotActivity(channelId, botId) : 0;
    const timeSinceLastActivity = lastActivityTime > 0 ? Math.max(0, (Date.now() - lastActivityTime)) : Infinity;
    const withinGrace = graceMs > 0 && lastActivityTime > 0 && timeSinceLastActivity <= graceMs;

    const allowUnaddressedBots = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
    if (!allowUnaddressedBots && !withinGrace) {
      return { shouldReply: false, reason: 'Unaddressed bot message disabled' };
    }
  }

  // If directly addressed (mention, reply, wakeword, DM, or name), skip unsolicited gating,
  // but still use the probability roll with a bonus (see applyModifiers).

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
  const SILENCE_THRESHOLD = Number(getMessageSetting('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS', botConfig)) || (5 * 60 * 1000);

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
  const baseChanceRaw = getMessageSetting('MESSAGE_UNSOLICITED_BASE_CHANCE', botConfig);
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
    const windowRaw = getMessageSetting('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS', botConfig);
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

  // Prevent bot-to-bot storms when the provided context contains no user messages at all.
  // Only apply when the triggering message is from a bot; do not penalize user-originated prompts.
  const botRatioPenalty = (isFromBot && uniqueUsers.size === 0) ? -0.5 : 0;
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

  const modResult = applyModifiers(
    message,
    botId,
    platform,
    chance,
    (isDirectMention || isWakeword || isNameAddressed || isDM),
    isLeadingAddress,
    isReplyToBot,
    botConfig
  );
  chance = modResult.chance;


  // 5. BurstTraffic: Per-bot - only count messages AFTER this bot's last post
  try {
    let msgsSinceLastPost = 0;
    let userPostedRecently = false;
    const oneMinuteAgo = Date.now() - 60000;

    if (historyMessages && historyMessages.length > 0 && lastPostTime > 0) {
      for (const msg of historyMessages) {
        const ts = (msg as any).timestamp || (msg as any).createdAt || 0;
        const msgTime = ts instanceof Date ? ts.getTime() : ts;
        const aid = msg.getAuthorId?.() || '';
        const isBot = msg.isFromBot?.() || false;

        if (msgTime > lastPostTime && aid !== botId) {
          msgsSinceLastPost++;
        }
        // Check if a USER (not bot) posted in last minute
        if (!isBot && msgTime > oneMinuteAgo) {
          userPostedRecently = true;
        }
      }
    } else if (!lastPostTime || lastPostTime === 0) {
      // Bot has never posted - use full history count (capped)
      msgsSinceLastPost = historyMessages ? Math.min(historyMessages.length, 5) : 0;
    }

    // Check if current message is from a user (not bot)
    if (!isFromBot) {
      userPostedRecently = true;
    }

    // BurstTraffic penalty - HALVED from previous values
    const burstPenalty = Math.max(-0.15, (msgsSinceLastPost - 1) * 0.025 * -1);
    if (burstPenalty !== 0) {
      chance += burstPenalty;
      mods.push(`BurstTraffic(${burstPenalty.toFixed(2)})`);
    }

    // UserActive bonus - encourage engagement when users are present
    if (userPostedRecently) {
      chance += 0.20;
      mods.push(`+UserActive(+0.20)`);
    }

    // Quiet Channel Bonus (5 min window) - still global as it's about channel activity
    if (density && typeof (density as any).getDensity === 'function') {
      const quietWindow = 300000;
      const { total: total5m } = (density as any).getDensity(channelId, quietWindow);
      const quietBonus = 0.20 * Math.max(0, 1 - (total5m / 5));
      if (quietBonus > 0) {
        chance += quietBonus;
        mods.push(`+QuietChannel(+${quietBonus.toFixed(2)})`);
      }
    }
  } catch { }


  // 6. Global Activity (Fatigue) Penalty
  const activityScore = GlobalActivityTracker.getInstance().getScore(botId);
  const fatigueThreshold = Number(process.env.BOT_GLOBAL_SCORE_LIMIT) || 2.0;

  if (activityScore > fatigueThreshold) {
    const excess = activityScore - fatigueThreshold;
    const fatiguePenalty = Math.max(-0.9, -(excess * 0.05)); // Cap at -0.9

    // Only apply if significant
    if (Math.abs(fatiguePenalty) >= 0.01) {
      chance += fatiguePenalty;
      mods.push(`GlobalFatigue(${fatiguePenalty.toFixed(2)})`);
    }
  }

  const allModStrings = [...mods, ...extractModifierTokens(modResult.modifiers)].filter(Boolean);

  // Convert mods array to JSON object for cleaner output
  const modsObject: Record<string, number | string> = {};
  for (const modStr of allModStrings) {
    // Parse patterns like "Base(0.01 @ never)", "+Recent(+0.5)", "BotHistory(-0.10)"
    const match = modStr.match(/^([+\-×]?)([\w!]+)\(([^)]+)\)$/);
    if (match) {
      const [, sign, name, value] = match;
      const numValue = parseFloat(value.replace(/@.*/, '').trim());
      if (!isNaN(numValue)) {
        modsObject[name] = numValue;
      } else {
        modsObject[name] = value; // Keep as string if not purely numeric
      }
    }
  }

  // Crowded conversation multiplier: if bot hasn't posted recently and many others are typing,
  // multiply probability down to avoid joining an already crowded conversation.
  // 1 typer = 1.0x (no penalty), 2 typers = 0.75x, 3+ typers = 1/count
  if (!hasPostedRecently) {
    const channelId = message.getChannelId();
    const allTypingUsers = TypingMonitor.getInstance().getTypingUsers(channelId);
    const otherTypingCount = allTypingUsers.filter((uid: string) => uid !== botId).length;

    if (otherTypingCount > 0) {
      // Significant penalty: 1 typer = 0.5x, 2 typers = 0.33x, 3 typers = 0.25x
      const crowdedMultiplier = 1.0 / (otherTypingCount + 1);
      chance *= crowdedMultiplier;
      modsObject['Crowded'] = crowdedMultiplier;
    }

  }

  chance = Math.max(0, Math.min(1, chance));
  const roll = Math.random();
  let decision = roll < chance;

  // Generate human-readable prose explanation
  const prose = generateProseExplanation(modsObject, decision, isDirectlyAddressed, hasPostedRecently);

  return {
    shouldReply: decision,
    reason: isDirectlyAddressed
      ? (decision ? 'Directly addressed (chance roll success)' : 'Directly addressed (chance roll failure)')
      : (decision ? 'Chance roll success' : 'Chance roll failure'),
    meta: {
      probability: `<${Number(chance.toPrecision(3))}`,
      rolled: Number(roll.toPrecision(3)),
      mods: modsObject,
      prose,
      colorizedMods: generateColorizedModsSummary(modsObject)
    }
  };
}

// ANSI color codes for console output
const COLORS = {
  reset: '\x1b[0m',
  // Greens (bonuses) - lighter to darker
  greenLight: '\x1b[92m',    // Bright green (slight bonus)
  greenMed: '\x1b[32m',      // Green (moderate bonus)
  greenDark: '\x1b[32;1m',   // Bold green (strong bonus)
  // Reds (penalties) - lighter to darker
  redLight: '\x1b[91m',      // Bright red (slight penalty)
  redMed: '\x1b[31m',        // Red (moderate penalty)
  redDark: '\x1b[31;1m',     // Bold red (strong penalty)
  gray: '\x1b[90m',          // Gray for neutral
};

/**
 * Generate colorized modifier summary with adjectives for console output
 */
function generateColorizedModsSummary(mods: Record<string, number | string>): string {
  const parts: string[] = [];

  for (const [name, value] of Object.entries(mods)) {
    if (typeof value !== 'number') continue;

    const absVal = Math.abs(value);
    const isBonus = value > 0;
    const isNeutral = value === 0;

    // Determine adjective and color based on magnitude
    let adjective: string;
    let color: string;

    if (isNeutral) {
      adjective = '';
      color = COLORS.gray;
    } else if (absVal <= 0.1) {
      adjective = 'slight';
      color = isBonus ? COLORS.greenLight : COLORS.redLight;
    } else if (absVal <= 0.3) {
      adjective = 'moderate';
      color = isBonus ? COLORS.greenMed : COLORS.redMed;
    } else if (absVal <= 0.5) {
      adjective = 'strong';
      color = isBonus ? COLORS.greenDark : COLORS.redDark;
    } else {
      adjective = 'very strong';
      color = isBonus ? COLORS.greenDark : COLORS.redDark;
    }

    const sign = value >= 0 ? '+' : '';
    const label = adjective ? `${adjective} ${name}` : name;
    parts.push(`${color}${label}(${sign}${value.toFixed(2)})${COLORS.reset}`);
  }

  return parts.join(' ');
}


/**
 * Generate a human-readable prose explanation of why the bot is responding/skipping
 * Uses modifier magnitudes to add adjectives (slight/moderate/strong)
 */
function generateProseExplanation(
  mods: Record<string, number | string>,
  decided: boolean,
  wasDirectlyAddressed: boolean,
  hasPostedRecently: boolean
): string {
  // Helper to get adjective based on magnitude
  const getAdjective = (value: number): string => {
    const abs = Math.abs(value);
    if (abs <= 0.1) return 'slightly';
    if (abs <= 0.3) return '';  // No adjective for moderate
    if (abs <= 0.5) return 'strongly';
    return 'very strongly';
  };

  // Collect bonuses with magnitudes
  const bonuses: { phrase: string; value: number }[] = [];

  // Direct address reasons
  if (wasDirectlyAddressed) {
    if (typeof mods.Mention === 'number') {
      bonuses.push({ phrase: 'mentioned', value: mods.Mention });
    }
    if (typeof mods.Leading === 'number') {
      bonuses.push({ phrase: 'addressed first', value: mods.Leading });
    }
    if (typeof mods.Reply === 'number') {
      bonuses.push({ phrase: 'replied to', value: mods.Reply });
    }
  }

  // Other bonuses
  if (typeof mods.Recent === 'number' && mods.Recent > 0) {
    bonuses.push({ phrase: 'recently active in chat', value: mods.Recent });
  }
  if (typeof mods.UserActive === 'number' && mods.UserActive > 0) {
    bonuses.push({ phrase: 'user activity', value: mods.UserActive });
  }
  if (typeof mods.OnTopic === 'number') {
    bonuses.push({ phrase: 'on-topic conversation', value: mods.OnTopic });
  }
  if (typeof mods.Q === 'number') {
    bonuses.push({ phrase: 'question asked', value: mods.Q });
  }

  // Collect penalties with magnitudes
  const penalties: { phrase: string; value: number }[] = [];
  if (typeof mods.BotHistory === 'number' && mods.BotHistory < 0) {
    penalties.push({ phrase: 'talked too much', value: mods.BotHistory });
  }
  if (typeof mods.BurstTraffic === 'number' && mods.BurstTraffic < 0) {
    penalties.push({ phrase: 'busy channel', value: mods.BurstTraffic });
  }
  if (typeof mods.Crowded === 'number' && mods.Crowded < 1) {
    penalties.push({ phrase: 'crowded typing', value: 1 - mods.Crowded });
  }
  if (typeof mods.BotRatio === 'number' && mods.BotRatio < 0) {
    penalties.push({ phrase: 'no human participants', value: mods.BotRatio });
  }
  if (typeof mods.AddressedToOther === 'number') {
    penalties.push({ phrase: 'message for someone else', value: mods.AddressedToOther });
  }
  if (typeof mods.OffTopic === 'number') {
    penalties.push({ phrase: 'off-topic', value: mods.OffTopic });
  }

  // Sort by magnitude (highest impact first)
  bonuses.sort((a, b) => b.value - a.value);
  penalties.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  // Build final sentence with adjectives
  if (decided) {
    if (wasDirectlyAddressed) {
      return bonuses.length > 0
        ? `Responding to direct mention (plus ${bonuses.map(b => b.phrase).join(', ')}).`
        : 'Responding to direct address.';
    }

    if (bonuses.length > 0) {
      const all = bonuses.map(b => {
        const adj = getAdjective(b.value);
        return adj ? `${adj} ${b.phrase}` : b.phrase;
      });
      return `Responding due to ${formatList(all)}.`;
    }
    return hasPostedRecently
      ? 'Responding to continue the conversation.'
      : 'Responding based on chance.';
  } else {

    if (penalties.length > 0) {
      const all = penalties.map(p => {
        const adj = getAdjective(p.value);
        return adj ? `${adj} ${p.phrase}` : p.phrase;
      });
      return `Skipping due to ${formatList(all)}.`;
    }
    return 'Skipping based on low probability.';
  }
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function extractModifierTokens(modifiers?: string): string[] {
  if (!modifiers || modifiers === 'none') return [];
  return modifiers.match(/[+\-×]?[\w!]+\([^)]+\)/g) || [];
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
  isReplyToBot: boolean = false,
  botConfig?: Record<string, any>
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
    const penalty = Number(getMessageSetting('MESSAGE_SHORT_LENGTH_PENALTY', botConfig)) || 0;
    if (penalty > 0) {
      chance -= penalty;
      mods.push(`-Short(${penalty})`);
    }
  }
  if (typeof message.isFromBot === 'function' && message.isFromBot()) {
    const botModifier = Number(getMessageSetting('MESSAGE_BOT_RESPONSE_MODIFIER', botConfig)) || -0.1;
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
