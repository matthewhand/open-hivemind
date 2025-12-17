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
    text.includes(`<@!${botId}>`);  // Discord nickname mention format

  const isReplyToBot =
    (typeof message.isReplyToBot === 'function' && message.isReplyToBot()) ||
    ((message as any)?.metadata?.replyTo?.userId === botId);

  const isWakeword = wakewords.some((word: string) => word && text.startsWith(String(word).toLowerCase()));

  const namesRaw = Array.isArray(botNameOrNames) ? botNameOrNames : [botNameOrNames].filter(Boolean);
  const nameCandidates = Array.from(new Set(
    namesRaw
      .flatMap((n) => {
        const name = String(n || '').trim();
        if (!name) return [];
        // If the configured name includes an instance suffix like "Name #1", allow matching the base too.
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

  // Never respond to our own messages (provider-agnostic).
  try {
    if (typeof message.getAuthorId === 'function' && message.getAuthorId() === botId) {
      debug('Message from bot itself. Not replying.');
      return { shouldReply: false, reason: 'Message from self' };
    }
  } catch { }

  // 1. Global Ignore Bots (Check first)
  if (isFromBot) {
    const ignoreBots = Boolean(messageConfig.get('MESSAGE_IGNORE_BOTS'));
    if (ignoreBots) {
      debug('Ignoring bot message (MESSAGE_IGNORE_BOTS=true)');
      return { shouldReply: false, reason: 'Bots ignored via config' };
    }

    const limitToDefault = Boolean(messageConfig.get('MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL'));
    if (limitToDefault && defaultChannelId && channelId !== defaultChannelId) {
      debug(`Bot message not in default channel (${defaultChannelId}); not replying.`);
      return { shouldReply: false, reason: 'Bot replies limited to default channel' };
    }
  }

  // If configured to only respond when spoken to, check grace window for non-addressed messages
  if (onlyWhenSpokenTo && !isDirectlyAddressed) {
    const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;

    let lastActivityTime = -1;
    let timeSinceLastActivity = -1;

    if (graceMs > 0) {
      lastActivityTime = getLastBotActivity(channelId, botId);
      timeSinceLastActivity = Date.now() - lastActivityTime;
      if (lastActivityTime > 0 && timeSinceLastActivity <= graceMs) {
        debug(`MESSAGE_ONLY_WHEN_SPOKEN_TO grace window active; proceeding to probability check.`);
        // Fall through to probability check
      } else {
        debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and not addressed, no grace; not replying.');
        return {
          shouldReply: false,
          reason: 'Not addressed (OnlyWhenSpokenTo)',
          meta: {
            mods: 'none',
            last: timeSinceLastActivity >= 0 ? `${Math.round(timeSinceLastActivity / 1000)}s` : 'never'
          }
        };
      }
    } else {
      debug('MESSAGE_ONLY_WHEN_SPOKEN_TO enabled and not addressed; not replying.');
      return {
        shouldReply: false,
        reason: 'Not addressed (OnlyWhenSpokenTo)',
        meta: { mods: 'none' }
      };
    }
  }

  // Note: Direct mentions will get +1.0 bonus via applyModifiers, guaranteeing response


  // Safety by default: avoid bot-to-bot loops unless explicitly allowed.
  // This only affects unaddressed bot messages. If a bot pings/replies/wakewords/names us, we reply normally.
  if (isFromBot) {
    // If the bot has spoken recently in this channel, allow continued interactivity even under conservative settings.
    // (This mirrors the "floodgates open" behavior for human users.)
    const graceMsRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
    const graceMs = typeof graceMsRaw === 'number' ? graceMsRaw : Number(graceMsRaw) || 0;
    const lastActivityTime = graceMs > 0 ? getLastBotActivity(channelId, botId) : 0;
    const timeSinceLastActivity = lastActivityTime > 0 ? (Date.now() - lastActivityTime) : Number.POSITIVE_INFINITY;
    const withinGrace = graceMs > 0 && lastActivityTime > 0 && timeSinceLastActivity <= graceMs;

    const allowUnaddressedBots = Boolean(messageConfig.get('MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED'));
    if (!allowUnaddressedBots && !withinGrace) {
      debug('Message from another bot and bot-to-bot unaddressed replies are disabled (and not within grace); not replying.');
      return { shouldReply: false, reason: 'Unaddressed bot message disabled' };
    }
  }

  // Calculate densities based on provided history (User Request: "user density is how many users are in the chat history provided")
  const recentHistory = historyMessages ? historyMessages.slice(-15) : []; // Look at last 15 messages
  const uniqueUsers = new Set<string>();
  const uniqueBots = new Set<string>();
  let selfMsgCount = 0;
  let selfTokenCount = 0;

  for (const msg of recentHistory) {
    try {
      const aid = msg.getAuthorId?.() || 'unknown';
      const isBot = msg.isFromBot?.() || false;

      if (aid === botId) {
        selfMsgCount++;
        const content = msg.getText?.() || '';
        // Approximate tokens: char count / 4
        selfTokenCount += Math.ceil(content.length / 4);
      } else if (isBot) {
        uniqueBots.add(aid);
      } else {
        uniqueUsers.add(aid);
      }
    } catch { }
  }

  // "MsgDensity" = Messages *this* instance has sent
  // Penalty: -0.05 per message (if we are spamming, stop)
  const msgDensityPenalty = Math.max(0, selfMsgCount * 0.05) * -1;

  // "TokenDensity" = Total tokens *this* instance has sent recently
  // Penalty: -0.0001 per token (at 1000 tokens = -0.1)
  const tokenDensityPenalty = Math.max(0, selfTokenCount * 0.0001) * -1;

  // "UserDensity" = How many unique users are talking
  // Penalty: -0.02 per extra user > 1 (if >1 user talking, let them talk)
  const userDensityPenalty = uniqueUsers.size > 1 ? (Math.max(0, (uniqueUsers.size - 1) * 0.02) * -1) : 0;

  // "BotDensity" = How many unique OTHER bots are talking
  // Penalty: -0.1 per bot (Increased to prevent bot storms)
  const botDensityPenalty = Math.max(0, uniqueBots.size * 0.1) * -1;

  // Integrate Unsolicited Message Handler (only for unaddressed messages).
  // If the user directly addressed the bot (mention/reply/wakeword/name), we allow the pipeline to proceed.
  if (!isDirectlyAddressed) {
    try {
      if (!shouldReplyToUnsolicitedMessage(message, botId, platform)) {
        debug('Unsolicited message handler rejected reply (bot inactive in channel & no direct mention)');
        const lastActivity = getLastBotActivity(channelId);
        const lastStr = lastActivity > 0 ? `${Math.round((Date.now() - lastActivity) / 1000)}s` : 'never';
        return {
          shouldReply: false,
          reason: 'Unsolicited handler rejected (inactive channel)',
          meta: { mods: 'none', last: lastStr }
        };
      }
    } catch (err) {
      // Fail closed: unsolicited gating errors should never cause the bot to start replying broadly.
      debug('Error in unsolicited message handler; not replying:', err);
      return { shouldReply: false, reason: 'Unsolicited handler error', meta: { error: String(err) } };
    }
  }

  // 1. Long Silence Penalty Logic
  const mods: string[] = [];
  const lastInteractionTime = getLastBotActivity(channelId, botId);
  const timeSinceLastActivity = Date.now() - lastInteractionTime;
  // Use grace window config if set, otherwise default 5 minutes
  const thresholdRaw = messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS');
  const SILENCE_THRESHOLD = typeof thresholdRaw === 'number' ? thresholdRaw : Number(thresholdRaw) || (5 * 60 * 1000);
  const hasPostedRecently = timeSinceLastActivity <= SILENCE_THRESHOLD;

  const lastStr = isNaN(timeSinceLastActivity) ? 'never' : `${Math.round(timeSinceLastActivity / 1000)}s`;
  const baseChanceRaw = messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE');
  const configuredBaseChance = typeof baseChanceRaw === 'number'
    ? baseChanceRaw
    : (typeof baseChanceRaw === 'string' && baseChanceRaw.trim() !== '' ? Number(baseChanceRaw) : Number.NaN);

  // "infact we should set the base chance to 0%"
  let chance = 0.0;
  if (Number.isFinite(configuredBaseChance)) {
    chance = configuredBaseChance;
  }

  const baseChance = chance; // Store for meta logs (pre-recency + pre-modifiers)
  mods.push(`Base(${baseChance.toFixed(2)} @ ${lastStr})`);

  if (hasPostedRecently) {
    chance += 0.5;
    mods.push('+Recent(+0.5)');
    debug(`Recent activity detected (${lastStr}). Applied +0.5 bonus. Chance: ${chance}`);
    debug(`ACTIVE | channel: ${channelId} | bot: ${botId} | chance: ${(chance * 100).toFixed(0)}% | last: ${lastStr}`);
  } else {
    debug(`Long silence detected (> threshold). Using base chance: ${(chance * 100).toFixed(0)}%`);
    debug(`INACTIVE | channel: ${channelId} | bot: ${botId} | chance: ${(chance * 100).toFixed(0)}% | last: ${lastStr}`);

    // Participant-aware adjustment: if fewer unique participants are active, be more likely to join;
    // if many participants are active, be less likely to interject.
    const participantWindowMsRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_WINDOW_MS');
    const participantWindowMs = typeof participantWindowMsRaw === 'number'
      ? participantWindowMsRaw
      : Number(participantWindowMsRaw) || (5 * 60 * 1000);

    const participantCount = IncomingMessageDensity.getInstance().getUniqueParticipantCount(channelId, participantWindowMs);

    const refRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_REFERENCE');
    const reference = Math.max(1, Number(refRaw) || 2);

    const minRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MIN_FACTOR');
    const maxRaw = messageConfig.get('MESSAGE_UNSOLICITED_SILENCE_PARTICIPANT_MAX_FACTOR');
    const minFactor = Math.max(0, Number(minRaw) || 0.25);
    const maxFactor = Math.max(minFactor, Number(maxRaw) || 3);

    const factor = Math.max(minFactor, Math.min(maxFactor, reference / Math.max(1, participantCount)));
    chance *= factor;
    debug(`Silent participant factor: participants=${participantCount} factor=${factor.toFixed(2)} chance=${chance}`);
  }

  // 2. Density Logic (Additive Penalties based on History)
  if (msgDensityPenalty < 0) {
    chance += msgDensityPenalty;
    mods.push(`MsgDensity(${msgDensityPenalty.toFixed(2)})`);
  }
  if (userDensityPenalty < 0) {
    chance += userDensityPenalty;
    mods.push(`UserDensity(${userDensityPenalty.toFixed(2)})`);
  }
  if (botDensityPenalty < 0) {
    chance += botDensityPenalty;
    mods.push(`BotDensity(${botDensityPenalty.toFixed(2)})`);
  }

  // 3. Semantic Relevance Bonus (only when bot has posted recently AND message is on-topic)
  // This gives +0.9 flat bonus for continuing a conversation the bot is already in
  let isSemanticRelevant = false;

  if (hasPostedRecently && historyMessages && historyMessages.length > 0) {
    try {
      // Build context from last few messages
      const recentContext = historyMessages
        .slice(-5)
        .map((m: any) => {
          const author = m.getAuthorId?.() || 'unknown';
          const text = m.getText?.() || '';
          return `${author}: ${text}`;
        })
        .join('\n');

      const newMessage = message.getText?.() || '';
      isSemanticRelevant = await isOnTopic(recentContext, newMessage);

      if (isSemanticRelevant) {
        // +0.4 bonus for on-topic (reduced from 0.9 since Recent is now +0.5)
        chance += 0.4;
        mods.push('+OnTopic(+0.4)');
        debug(`On-topic + recent: applied +0.4 bonus. Chance: ${chance}`);
      } else {
        // -0.1 penalty for off-topic (switching context while active)
        chance -= 0.1;
        mods.push('-OffTopic(-0.1)');
        debug(`Off-topic + recent: applied -0.1 penalty. Chance: ${chance}`);
      }
    } catch (err) {
      debug(`Semantic relevance check error:`, err);
    }
  }

  // Addressed to Someone Else Penalty
  const isAddressedToSomeone =
    (typeof message.getUserMentions === 'function' && (message.getUserMentions() || []).length > 0) ||
    /^@\w+/.test(text);

  if (isAddressedToSomeone && !isDirectlyAddressed) {
    const penalty = -0.5;
    chance += penalty;
    mods.push(`AddressedToOther(${penalty})`);
    debug(`Addressed to someone else. Applied penalty: ${penalty}. New chance: ${chance}`);
  }

  // No Opportunity Penalty
  const isOpportunity = looksLikeOpportunity(text);
  if (!isOpportunity && !isDirectlyAddressed && !isSemanticRelevant) {
    const penalty = -0.5;
    chance += penalty;
    mods.push(`NoOpportunity(${penalty})`);
    debug(`No opportunity detected. Applied penalty: ${penalty}. New chance: ${chance}`);
  }

  // Calculate Leading Address Bonus (Refined: Support lists of mentions)
  let isLeadingAddress = false;
  if (isDirectlyAddressed) {
    // 1. Identify "My Address" patterns
    const myPatterns: RegExp[] = [
      new RegExp(`<@!?${botId}>`, 'i'), // My ID
      ...nameCandidates.map(n => new RegExp(`${escapeRegExp(n)}\\b`, 'i')) // My Names
    ];

    // 2. Find the *earliest* match index for any of my patterns
    let firstMatchIndex = Infinity;
    for (const pat of myPatterns) {
      const m = text.match(pat); // Case-insensitive match on full text
      if (m && m.index !== undefined && m.index < firstMatchIndex) {
        firstMatchIndex = m.index;
      }
    }

    if (firstMatchIndex !== Infinity) {
      // 3. Extract preceding text
      let preceding = text.substring(0, firstMatchIndex);

      // 4. Strip out *other* mention patterns from the preceding text
      //    (We assume generic <@...> or <!...> syntax for mentions)
      preceding = preceding.replace(/<(@|!|#|&|a:)[^>]+>/g, '');

      // 5. Check for any remaining alphanumeric content
      //    (If only symbols/whitespace remain, we are part of the "Header")
      //    Use [a-z0-9] because 'text' is already lowercased at start of function
      const hasContentBefore = /[a-z0-9]/.test(preceding);
      isLeadingAddress = !hasContentBefore;
    } else if (isWakeword) {
      // Wakewords are by definition prefix-based in our check `text.startsWith`
      isLeadingAddress = true;
    }
  }

  const modResult = applyModifiers(message, botId, platform, chance, isDirectlyAddressed, isLeadingAddress);
  chance = modResult.chance;
  const allMods = [...mods, modResult.modifiers !== 'none' ? modResult.modifiers : ''].filter(Boolean).join('') || 'none';

  // Clamp to [0, 1] to avoid pathological configs/modifiers.
  chance = Math.max(0, Math.min(1, chance));
  debug(`Final chance after applying all modifiers: ${chance}`);

  const roll = Math.random();
  const decision = roll < chance;
  debug(`Decision: ${decision} (chance = ${chance})`);

  return {
    shouldReply: decision,
    reason: decision ? 'Chance roll success' : 'Chance roll failure',
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
  isLeadingAddress: boolean = false
): { chance: number; modifiers: string } {
  const text = (message.getText?.() || '').toLowerCase();
  const mods: string[] = [];

  // Direct mention bonus (+1.0 = guaranteed response)
  if (isDirectlyAddressed) {
    chance += 1.0;
    mods.push('+Mention(+1.0)');
    debug(`Direct mention/wakeword detected. Applied +1.0 bonus. New chance: ${chance}`);

    // Leading mention double bonus
    if (isLeadingAddress) {
      chance += 1.0;
      mods.push('+Leading(+1.0)');
      debug(`Leading mention/wakeword detected. Applied additional +1.0 bonus (Double). New chance: ${chance}`);
    }
  }

  // Question mark bonus (+0.2)
  if (text.includes('?')) {
    chance += 0.2;
    mods.push('+Q(+0.2)');
    debug(`Question mark detected. Applied +0.2 bonus. New chance: ${chance}`);
  }

  // Exclamation mark bonus (+0.1)
  if (text.includes('!')) {
    chance += 0.1;
    mods.push('+!(+0.1)');
    debug(`Exclamation mark detected. Applied +0.1 bonus. New chance: ${chance}`);
  }

  // Short message penalty
  if (text.length < 10) {
    const penalty = Number(messageConfig.get('MESSAGE_SHORT_LENGTH_PENALTY')) || 0;
    if (penalty > 0) {
      chance -= penalty;
      mods.push(`-Short(${penalty})`);
      debug(`Short message detected (<10 chars). Applied penalty: ${penalty}. New chance: ${chance}`);
    }
  }

  // Bot-to-bot penalty vs User bonus
  if (typeof message.isFromBot === 'function' && message.isFromBot()) {
    const botModifier = Number(messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER')) || -0.1;
    chance += botModifier;
    mods.push(`${botModifier >= 0 ? '+' : ''}BotResponse(${botModifier})`);
    debug(`Message from another bot. Applied modifier: ${botModifier}. New chance: ${chance}`);
  } else {
    // If NOT from a bot (i.e. from a User), add +0.05 bonus
    // "set +User(0.05)"
    const userModifier = 0.05;
    chance += userModifier;
    mods.push(`+UserResponse(${userModifier})`);
  }



  // Channel bonus multiplier
  const channelBonuses: Record<string, number> = (messageConfig.get as any)('CHANNEL_BONUSES') || {};
  const channelBonus = typeof channelBonuses?.[message.getChannelId()] === 'number' ? channelBonuses[message.getChannelId()] : 1.0;
  if (channelBonus !== 1.0) {
    chance *= channelBonus;
    mods.push(`×Chan(${channelBonus})`);
    debug(`Applied channel bonus multiplier: ${channelBonus}. New chance: ${chance}`);
  }

  return { chance, modifiers: mods.join('') || 'none' };
}
