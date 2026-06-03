/**
 * Connected-bots indexing utilities.
 *
 * Integration panels repeatedly need "which bots are connected to provider X?".
 * Doing that as `bots.filter(...)` inside a render `.map()` is O(N*M) (N
 * integrations × M bots). These helpers build the index once in O(M) so each
 * lookup is O(1), and — being pure functions — they are unit-testable in
 * isolation and reusable by any component that renders provider→bot links.
 */

/** Minimal shape required to index a bot by the providers it is wired to. */
export interface ProviderLinkedBot {
  llmProvider?: string | null;
  messageProvider?: string | null;
}

/** Bots connected to a single provider, split by how they are connected. */
export interface ConnectedBotEntry<T> {
  /** Bots using this provider as their LLM provider. */
  llm: T[];
  /** Bots using this provider as their message provider. */
  message: T[];
}

export type ConnectedBotsMap<T> = Map<string, ConnectedBotEntry<T>>;

export type ConnectionCategory = 'llm' | 'message';

/**
 * Build an index of bots keyed by provider name, split by connection category.
 *
 * A bot wired to both an LLM provider and a message provider is indexed under
 * both keys. Falsy/empty provider names are ignored.
 *
 * @param bots The bots to index.
 * @returns A map of `providerName -> { llm, message }`.
 */
export function buildConnectedBotsMap<T extends ProviderLinkedBot>(bots: readonly T[]): ConnectedBotsMap<T> {
  const map: ConnectedBotsMap<T> = new Map();

  const entryFor = (key: string): ConnectedBotEntry<T> => {
    let entry = map.get(key);
    if (!entry) {
      entry = { llm: [], message: [] };
      map.set(key, entry);
    }
    return entry;
  };

  for (const bot of bots) {
    if (bot.llmProvider) {
      entryFor(bot.llmProvider).llm.push(bot);
    }
    if (bot.messageProvider) {
      entryFor(bot.messageProvider).message.push(bot);
    }
  }

  return map;
}

/**
 * Resolve the bots connected to an integration from a pre-built map.
 *
 * Unknown integrations resolve to an empty array. Any category other than
 * `'llm'` is treated as a message connection, matching the historical
 * `getConnectedBots` behaviour it replaces.
 *
 * @param map A map produced by {@link buildConnectedBotsMap}.
 * @param integrationName The provider/integration name to look up.
 * @param category `'llm'` for LLM connections, otherwise message connections.
 */
export function getConnectedBotsFrom<T>(
  map: ConnectedBotsMap<T>,
  integrationName: string,
  category: ConnectionCategory | string,
): T[] {
  const entry = map.get(integrationName);
  if (!entry) return [];
  return category === 'llm' ? entry.llm : entry.message;
}
