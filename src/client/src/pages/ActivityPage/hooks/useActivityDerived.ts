import { useMemo } from 'react';
import type { ActivityEvent } from '../../../services/api';

export function useActivityDerived(
  allEvents: ActivityEvent[],
  searchQuery: string,
  eventTypes: Set<string>
) {
  const events = allEvents;

  // Filter events client-side based on search query
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by event type
    if (!eventTypes.has('all')) {
      result = result.filter(e => eventTypes.has(e.messageType) || (e.status !== 'success' && eventTypes.has(e.status)));
    }

    // Filter by search query
    if (!searchQuery) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(e =>
      e.botName.toLowerCase().includes(lowerQuery) ||
      e.provider.toLowerCase().includes(lowerQuery) ||
      e.llmProvider.toLowerCase().includes(lowerQuery) ||
      e.status.toLowerCase().includes(lowerQuery) ||
      (e.errorMessage && e.errorMessage.toLowerCase().includes(lowerQuery))
    );
  }, [events, searchQuery, eventTypes]);

  // Defensive `?? []`: filteredEvents has been observed as undefined on first
  // render under some redirect timings (/admin/activity → /admin/overview?tab=
  // activity), which crashed the OverviewPage error boundary with "Cannot read
  // properties of undefined (reading 'forEach')". Normalize once, use everywhere.
  const safeFilteredEvents = filteredEvents ?? [];

  // Group events into per-channel conversation threads. A channel can host
  // several personas at once (the whole point of a hivemind), so the thread
  // key is the channel — NOT channel+bot — and every bot that chimed in shows
  // up inside the same transcript.
  const conversationThreads = useMemo(() => {
    const threads = new Map<string, ActivityEvent[]>();
    safeFilteredEvents.forEach(event => {
      const threadKey = event.channelName || event.channelId || 'unknown-channel';
      if (!threads.has(threadKey)) {
        threads.set(threadKey, []);
      }
      threads.get(threadKey)!.push(event);
    });
    return Array.from(threads.entries())
      .map(([channelLabel, threadEvents]) => {
        const sorted = [...threadEvents].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return {
          channelLabel,
          events: sorted,
          botNames: Array.from(
            new Set(sorted.filter(e => e.messageType === 'outgoing').map(e => e.botName))
          ),
          lastActivity: new Date(sorted[sorted.length - 1].timestamp).getTime(),
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }, [safeFilteredEvents]);

  const timelineEvents = safeFilteredEvents.map(event => ({
    id: event.id || `${event.timestamp}-${event.botName}`,
    timestamp: new Date(event.timestamp),
    title: `${event.botName}: ${event.status}`,
    description: `Provider: ${event.provider} | LLM: ${event.llmProvider}`,
    type: event.status === 'error' || event.status === 'timeout' ? 'error' as const :
      event.status === 'success' ? 'success' as const : 'info' as const,
    metadata: { ...event },
  }));

  return {
    events,
    safeFilteredEvents,
    conversationThreads,
    timelineEvents,
  };
}
