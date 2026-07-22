import messageConfig from '@config/messageConfig';
import type { PersonaResponseBehavior } from '../../../../managers/PersonaManager';
import { getMessageSetting } from '../ResponseProfile';
import type { MessageLike } from './types';

export function extractModifierTokens(modifiers?: string): string[] {
  if (!modifiers || modifiers === 'none') {
    return [];
  }
  return modifiers.match(/[+\-×]?[\w!]+\([^)]+\)/g) || [];
}

export function applyModifiers(
  message: MessageLike,
  botId: string,
  platform: 'discord' | 'generic',
  chance: number,
  isDirectlyAddressed = false,
  isLeadingAddress = false,
  isReplyToBot = false,
  botConfig?: Record<string, unknown>,
  personaBehavior?: PersonaResponseBehavior
): { chance: number; modifiers: string } {
  const text = (message.getText?.() || '').toLowerCase();
  const mods: string[] = [];
  if (isDirectlyAddressed) {
    const mentionBonus = personaBehavior?.mentionBonus ?? 0.5;
    chance += mentionBonus;
    mods.push(`+Mention(+${mentionBonus})`);
    if (isLeadingAddress) {
      const leadingBonus = personaBehavior?.leadingMentionBonus ?? 1.0;
      chance += leadingBonus;
      mods.push(`+Leading(+${leadingBonus})`);
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
    const botModifier =
      personaBehavior?.botResponsePenalty ??
      (Number(getMessageSetting('MESSAGE_BOT_RESPONSE_MODIFIER', botConfig)) || -0.1);
    chance += botModifier;
    mods.push(`${botModifier >= 0 ? '+' : ''}BotResponse(${botModifier})`);
  }

  const channelBonuses: Record<string, number> =
    (messageConfig.get('CHANNEL_BONUSES') as Record<string, number>) || {};
  const channelBonus =
    typeof channelBonuses?.[message.getChannelId()] === 'number'
      ? channelBonuses[message.getChannelId()]
      : 1.0;
  if (channelBonus !== 1.0) {
    const additiveBonus = channelBonus - 1.0;
    chance += additiveBonus;
    mods.push(`Chan(${additiveBonus >= 0 ? '+' : ''}${additiveBonus.toFixed(2)})`);
  }
  return { chance, modifiers: mods.join('') || 'none' };
}
