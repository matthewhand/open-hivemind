import { useCallback, useMemo } from 'react';
import {
  buildConnectedBotsMap,
  getConnectedBotsFrom,
  type ConnectedBotsMap,
  type ConnectionCategory,
  type ProviderLinkedBot,
} from '../utils/connectedBots';

/**
 * Memoized provider→bot index for integration panels.
 *
 * Builds the connected-bots map once per `bots` change (O(M)) and returns a
 * stable `getConnectedBots(integrationName, category)` accessor that performs
 * O(1) lookups — replacing per-render `bots.filter()` calls inside `.map()`.
 */
export function useConnectedBots<T extends ProviderLinkedBot>(bots: T[]) {
  const connectedBotsMap = useMemo<ConnectedBotsMap<T>>(() => buildConnectedBotsMap(bots), [bots]);

  const getConnectedBots = useCallback(
    (integrationName: string, category: ConnectionCategory | string): T[] =>
      getConnectedBotsFrom(connectedBotsMap, integrationName, category),
    [connectedBotsMap],
  );

  return { connectedBotsMap, getConnectedBots };
}
