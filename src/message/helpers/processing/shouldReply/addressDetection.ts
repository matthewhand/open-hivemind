import { strings } from '@src/utils/common';
import messageConfig from '@config/messageConfig';
import { isBotNameInText } from '../MentionDetector';
import type { MessageLike } from './types';

export interface AddressDetectionResult {
  rawText: string;
  text: string;
  wakewords: string[];
  isDirectMention: boolean;
  isReplyToBot: boolean;
  isReplyToOther: boolean | string | undefined;
  isWakeword: boolean;
  nameCandidates: string[];
  isNameAddressed: boolean;
  isDM: boolean;
  isDirectlyAddressed: boolean;
  isFromBot: boolean;
}

/**
 * Detect mention / wakeword / name / DM address signals from a message.
 * Pure relative to messageConfig and the message interface — no side effects.
 */
export function detectAddressSignals(
  message: MessageLike,
  botId: string,
  botNameOrNames?: string | string[]
): AddressDetectionResult {
  const rawText = String(message.getText?.() || '');
  const text = rawText.toLowerCase();

  const wakewordsRaw = messageConfig.get('MESSAGE_WAKEWORDS');
  const wakewords = Array.isArray(wakewordsRaw)
    ? wakewordsRaw
    : String(wakewordsRaw)
        .split(',')
        .map((s) => s.trim());

  const isDirectMention =
    (typeof message.mentionsUsers === 'function' && message.mentionsUsers(botId)) ||
    (typeof message.isMentioning === 'function' && message.isMentioning(botId)) ||
    (typeof message.getUserMentions === 'function' &&
      (message.getUserMentions() || []).includes(botId)) ||
    text.includes(`<@${botId}>`) ||
    text.includes(`<@!${botId}>`);

  const isReplyToBot =
    (typeof message.isReplyToBot === 'function' && Boolean(message.isReplyToBot())) ||
    message?.metadata?.replyTo?.userId === botId;

  const replyToId = message?.metadata?.replyTo?.userId;
  const isReplyToOther = replyToId && replyToId !== botId;

  const isWakeword = wakewords.some(
    (word: string) => word && text.startsWith(String(word).toLowerCase())
  );

  const namesRaw = Array.isArray(botNameOrNames)
    ? botNameOrNames
    : [botNameOrNames].filter(Boolean);
  const nameCandidates = Array.from(
    new Set(
      namesRaw
        .flatMap((n) => {
          const name = String(n || '').trim();
          if (!name) {
            return [];
          }
          // Filter out generic names like "Bot" or "Assistant" if we have other more specific names.
          const genericNames = ['bot', 'assistant'];
          if (genericNames.includes(name.toLowerCase()) && namesRaw.length > 1) {
            return [];
          }
          const base = name.replace(/\s*#\d+\s*$/i, '').trim();
          return base && base !== name ? [name, base] : [name];
        })
        .filter(Boolean)
    )
  );
  const isNameAddressed = nameCandidates.some((n) => isBotNameInText(rawText, n));
  const isDM = typeof message.isDirectMessage === 'function' && message.isDirectMessage();
  const isDirectlyAddressed =
    isDirectMention || isReplyToBot || isWakeword || isNameAddressed || isDM;

  const isFromBot = (() => {
    try {
      return typeof message.isFromBot === 'function' ? Boolean(message.isFromBot()) : false;
    } catch {
      return false;
    }
  })();

  return {
    rawText,
    text,
    wakewords,
    isDirectMention,
    isReplyToBot,
    isReplyToOther,
    isWakeword,
    nameCandidates,
    isNameAddressed,
    isDM,
    isDirectlyAddressed,
    isFromBot,
  };
}

/**
 * Calculate whether the bot address appears at the leading position of the message.
 */
export function computeIsLeadingAddress(
  text: string,
  botId: string,
  nameCandidates: string[],
  isDirectlyAddressed: boolean,
  isWakeword: boolean
): boolean {
  let isLeadingAddress = false;
  if (isDirectlyAddressed) {
    const myPatterns: RegExp[] = [
      new RegExp(`<@!?${strings.escapeRegExp(botId)}>`, 'i'),
      ...nameCandidates.map((n) => new RegExp(`${strings.escapeRegExp(n)}\\b`, 'i')),
    ];
    let firstMatchIndex = Infinity;
    for (const pat of myPatterns) {
      const m = text.match(pat);
      if (m && m.index !== undefined && m.index < firstMatchIndex) {
        firstMatchIndex = m.index;
      }
    }
    if (firstMatchIndex !== Infinity) {
      const preceding = text.substring(0, firstMatchIndex).replace(/<(@|!|#|&|a:)[^>]+>/g, '');
      isLeadingAddress = !/[a-z0-9]/.test(preceding);
    } else if (isWakeword) {
      isLeadingAddress = true;
    }
  }
  return isLeadingAddress;
}
