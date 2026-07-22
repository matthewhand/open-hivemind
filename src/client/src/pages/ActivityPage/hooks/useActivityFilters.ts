import { useState } from 'react';
import useUrlParams from '../../../hooks/useUrlParams';
import type { ActivityEvent } from '../../../services/api';

export type ActivityViewMode = 'table' | 'timeline' | 'conversation';

export function useActivityFilters() {
  const [viewMode, setViewMode] = useState<ActivityViewMode>('table');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [eventTypes, setEventTypes] = useState<Set<string>>(new Set(['all']));
  const [replayEvent, setReplayEvent] = useState<ActivityEvent | null>(null);

  const toggleEventType = (type: string) => {
    setEventTypes(prev => {
      const next = new Set(prev);
      if (type === 'all') {
        return new Set(['all']);
      }
      next.delete('all');
      if (next.has(type)) {
        if (next.size === 1) return new Set(['all']); // Don't allow empty
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Filter State (URL-persisted)
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    bot: { type: 'string', default: 'all' },
    provider: { type: 'string', default: 'all' },
    llm: { type: 'string', default: 'all' },
    from: { type: 'string', default: '' },
    to: { type: 'string', default: '' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const selectedBot = urlParams.bot;
  const setSelectedBot = (v: string) => setUrlParam('bot', v);
  const selectedProvider = urlParams.provider;
  const setSelectedProvider = (v: string) => setUrlParam('provider', v);
  const selectedLlmProvider = urlParams.llm;
  const setSelectedLlmProvider = (v: string) => setUrlParam('llm', v);
  const startDate = urlParams.from;
  const setStartDate = (v: string) => setUrlParam('from', v);
  const endDate = urlParams.to;
  const setEndDate = (v: string) => setUrlParam('to', v);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedBot('all');
    setSelectedProvider('all');
    setSelectedLlmProvider('all');
    setStartDate('');
    setEndDate('');
  };

  // Quick time range presets
  const handleQuickTimeRange = (range: '1h' | '6h' | '24h' | '7d' | '30d') => {
    const now = new Date();
    const toDate = now.toISOString().split('T')[0];
    let fromDate: Date;

    switch (range) {
      case '1h':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    setStartDate(fromDate.toISOString().split('T')[0]);
    setEndDate(toDate);
  };

  return {
    viewMode,
    setViewMode,
    autoRefresh,
    setAutoRefresh,
    eventTypes,
    toggleEventType,
    replayEvent,
    setReplayEvent,
    searchQuery,
    setSearchQuery,
    selectedBot,
    setSelectedBot,
    selectedProvider,
    setSelectedProvider,
    selectedLlmProvider,
    setSelectedLlmProvider,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleClearFilters,
    handleQuickTimeRange,
  };
}
