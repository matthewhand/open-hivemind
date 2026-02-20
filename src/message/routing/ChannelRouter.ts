import Debug from 'debug';
import messageConfig from '../../config/messageConfig';

const debug = Debug('app:ChannelRouter');

export type ChannelId = string;

export interface ChannelRouterMetadata {
  recentActivityScore?: number; // optional future extension
  [key: string]: unknown;
}

/**
 * Safely parse a config value that may be:
 * - an object map (Record<string, number>)
 * - a CSV string like "C1:1.2,C2:0.8"
 * - empty/undefined/null => {}
 */
function parseKeyNumberMap(
  raw: unknown,
  coerce: (v: string) => number | null
): Record<string, number> {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    // assume already a map of numbers or strings
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, any>)) {
      // Always apply validation
      const num = coerce(String(v));
      if (num !== null) {
        out[k] = num;
      }
    }
    return out;
  }
  if (typeof raw === 'string') {
    const out: Record<string, number> = {};
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      const [k, vs] = p.split(':').map((s) => s.trim());
      if (!k || vs == null) {
        continue;
      }
      const num = coerce(vs);
      if (num !== null) {
        out[k] = num;
      }
    }
    return out;
  }
  return {};
}

/**
 * Get configured bonus map from messageConfig.
 * Allowed bonus range is [0.0, 2.0].
 */
export function getChannelBonuses(): Record<string, number> {
  const raw = messageConfig.get('CHANNEL_BONUSES') as unknown;
  const bonuses = parseKeyNumberMap(raw, (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) {
      return null;
    }
    if (n < 0.0 || n > 2.0) {
      return null;
    }
    return n;
  });
  return bonuses;
}

/**
 * Get configured priority map from messageConfig.
 * Priorities are integers, lower means higher priority.
 */
export function getChannelPriorities(): Record<string, number> {
  const raw = messageConfig.get('CHANNEL_PRIORITIES') as unknown;
  const priorities = parseKeyNumberMap(raw, (v) => {
    const n = Number(v);
    if (!Number.isInteger(n)) {
      return null;
    }
    return n;
  });
  return priorities;
}

/**
 * Returns the bonus for a channelId. Defaults to 1.0 when not configured.
 */
export function getBonusForChannel(channelId: ChannelId): number {
  const bonuses = getChannelBonuses();
  const b = bonuses[channelId];
  return typeof b === 'number' ? b : 1.0;
}

/**
 * Returns the priority for a channelId. Defaults to 0 when not configured.
 * Lower value means higher priority.
 */
export function getPriorityForChannel(channelId: ChannelId): number {
  const priorities = getChannelPriorities();
  const p = priorities[channelId];
  return typeof p === 'number' ? p : 0;
}

/**
 * Compute score using the confirmed formula:
 * score = base(1.0) * bonus(channelId) / (1 + priority(channelId))
 */
export function computeScore(channelId: ChannelId, _metadata?: ChannelRouterMetadata): number {
  const bonus = getBonusForChannel(channelId);
  const priority = getPriorityForChannel(channelId);
  const score = (1.0 * bonus) / (1 + priority);
  debug('computeScore', { channelId, bonus, priority, score });
  return score;
}

/**
 * Picks the best channel from candidates.
 * Tie-breakers: highest bonus, then lexicographic channelId.
 */
export function pickBestChannel(
  candidates: ChannelId[],
  metadata?: ChannelRouterMetadata
): ChannelId | null {
  if (!candidates || candidates.length === 0) {
    return null;
  }

  let best: { id: ChannelId; score: number; bonus: number } | null = null;

  for (const id of candidates) {
    const score = computeScore(id, metadata);
    const bonus = getBonusForChannel(id);
    if (!best) {
      best = { id, score, bonus };
      continue;
    }
    if (score > best.score) {
      best = { id, score, bonus };
    } else if (score === best.score) {
      // tie-break on highest bonus
      if (bonus > best.bonus) {
        best = { id, score, bonus };
      } else if (bonus === best.bonus) {
        // then lexicographic channelId
        if (id < best.id) {
          best = { id, score, bonus };
        }
      }
    }
  }

  return best ? best.id : null;
}
