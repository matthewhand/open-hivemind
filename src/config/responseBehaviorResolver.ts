import type { PersonaResponseBehavior } from '../managers/PersonaManager';
import messageConfig from './messageConfig';

/**
 * Fully resolved response behavior — every field has a concrete value
 * (either from persona override or global default).
 */
export interface ResolvedResponseBehavior {
  baseChance: number;
  mentionBonus: number;
  leadingMentionBonus: number;
  offTopicPenalty: number;
  botResponsePenalty: number;
  burstTrafficPenalty: number;
  userDensityPenalty: number;
  botRatioPenalty: number;
  onlyWhenSpokenTo: boolean;
  graceWindowMs: number;
  interactiveFollowups: boolean;
  unsolicitedAddressed: boolean;
  unsolicitedUnaddressed: boolean;
}

/**
 * Merge per-persona response behavior overrides with global defaults.
 *
 * For each field the persona value is used when explicitly set (not undefined);
 * otherwise the corresponding global messageConfig value (or a sensible
 * hard-coded default for fields that have no global env-var equivalent) is used.
 */
export function resolveResponseBehavior(
  persona?: PersonaResponseBehavior | null,
): ResolvedResponseBehavior {
  const p = persona ?? {};

  return {
    baseChance:
      p.baseChance ?? (messageConfig.get('MESSAGE_UNSOLICITED_BASE_CHANCE') as number),
    mentionBonus:
      p.mentionBonus ?? (messageConfig.get('MESSAGE_MENTION_BONUS') as number),
    leadingMentionBonus:
      p.leadingMentionBonus ?? 1.0,
    offTopicPenalty:
      p.offTopicPenalty ?? -0.1,
    botResponsePenalty:
      p.botResponsePenalty ?? (messageConfig.get('MESSAGE_BOT_RESPONSE_MODIFIER') as number),
    burstTrafficPenalty:
      p.burstTrafficPenalty ?? -0.1,
    userDensityPenalty:
      p.userDensityPenalty ?? -0.02,
    botRatioPenalty:
      p.botRatioPenalty ?? -0.30,
    onlyWhenSpokenTo:
      p.onlyWhenSpokenTo ?? (messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO') as boolean),
    graceWindowMs:
      p.graceWindowMs ?? (messageConfig.get('MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS') as number),
    interactiveFollowups:
      p.interactiveFollowups ?? (messageConfig.get('MESSAGE_INTERACTIVE_FOLLOWUPS') as boolean),
    unsolicitedAddressed:
      p.unsolicitedAddressed ?? (messageConfig.get('MESSAGE_UNSOLICITED_ADDRESSED') as boolean),
    unsolicitedUnaddressed:
      p.unsolicitedUnaddressed ?? (messageConfig.get('MESSAGE_UNSOLICITED_UNADDRESSED') as boolean),
  };
}
