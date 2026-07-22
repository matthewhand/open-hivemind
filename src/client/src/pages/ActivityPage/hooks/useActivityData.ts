/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, ActivityEvent, ActivityResponse } from '../../../services/api';
import { useWebSocket } from '../../../hooks/useWebSocket';

export function useActivityData(options: {
  selectedBot: string;
  selectedProvider: string;
  selectedLlmProvider: string;
  startDate: string;
  endDate: string;
  autoRefresh: boolean;
}) {
  const {
    selectedBot,
    selectedProvider,
    selectedLlmProvider,
    startDate,
    endDate,
    autoRefresh,
  } = options;

  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableFilters, setAvailableFilters] = useState<ActivityResponse['filters'] | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [_maxRetries, setMaxRetries] = useState(3);
  const [_retryDelay, setRetryDelay] = useState(1000); // 1 second initial delay
  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);
  const [allEvents, setAllEvents] = useState<ActivityEvent[]>([]);
  const [orchestrationLogs, setOrchestrationLogs] = useState<any[]>([]);
  const { socket } = useWebSocket();

  useEffect(() => {
    if (socket) {
      const handleDecision = (decision: any) => {
        setOrchestrationLogs(prev => [
          { ...decision, timestamp: new Date().toISOString() },
          ...prev
        ].slice(0, 50));
      };
      socket.on('pipeline_decision', handleDecision);
      return () => {
        socket.off('pipeline_decision', handleDecision);
      };
    }
  }, [socket]);

  // Build activity endpoint URL from filter state
  const activityUrl = useMemo(() => {
    const query = new URLSearchParams();
    if (selectedBot !== 'all') query.append('bot', selectedBot);
    if (selectedProvider !== 'all') query.append('messageProvider', selectedProvider);
    if (selectedLlmProvider !== 'all') query.append('llmProvider', selectedLlmProvider);
    if (startDate) query.append('from', new Date(startDate).toISOString());
    if (endDate) query.append('to', new Date(endDate).toISOString());
    query.append('limit', limit.toString());
    query.append('offset', offset.toString());
    const search = query.toString();
    return `/api/dashboard/activity${search ? `?${search}` : ''}`;
  }, [selectedBot, selectedProvider, selectedLlmProvider, startDate, endDate, limit, offset]);

  // Use cached query with optional polling
  const {
    data: activityResult,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery<ActivityResponse>({
    queryKey: ['activity', activityUrl],
    // /api/dashboard/activity wraps its payload in an ApiResponse envelope
    // ({ success, data: { events, ... } }). Unwrap it — treating the envelope
    // as the ActivityResponse left `events`/`filters` undefined, so the page
    // showed "No activity yet" / 0 stats even while the server had events.
    queryFn: async () => {
      const raw = await apiService.get<any>(activityUrl);
      return (raw?.events ? raw : raw?.data ?? raw) as ActivityResponse;
    },
    staleTime: 15_000,
    gcTime: 30_000,
    refetchInterval: autoRefresh ? 5000 : undefined,
  });

  // Active Bots reads the same /api/bots source as the Dashboard and Bots
  // pages so the stat cannot contradict them (see Dashboard.tsx).
  const { data: botsResult } = useQuery<any>({
    queryKey: ['activity', 'bots'],
    queryFn: () => apiService.get<any>('/api/bots'),
    staleTime: 15_000,
    gcTime: 30_000,
  });

  const activeBotCount = useMemo(() => {
    const botsList: any[] = Array.isArray(botsResult) ? botsResult
      : Array.isArray(botsResult?.data) ? botsResult.data
      : botsResult?.data?.bots ?? botsResult?.bots ?? [];
    if (!Array.isArray(botsList) || botsList.length === 0) return null;
    return botsList.filter((bot) => {
      const botStatus = (bot?.status || '').toLowerCase();
      return botStatus === 'active' || botStatus === 'running' || bot?.connected;
    }).length;
  }, [botsResult]);

  // Sync into local state. Guard against APIs returning a malformed body
  // without an `events` array — observed during slow first paint of /admin/
  // activity, which used to crash the boundary on filteredEvents.length etc.
  useEffect(() => {
    if (activityResult) {
      const incoming = activityResult.events ?? [];
      if (offset === 0) {
        setAllEvents(incoming);
      } else {
        setAllEvents(prev => [...prev, ...incoming]);
      }
      setData(activityResult);
      if (activityResult.filters) {
        setAvailableFilters(prev => prev || activityResult.filters);
      }
      setRetryCount(0);
      setRetryDelay(1000);
    }
  }, [activityResult, offset]);

  useEffect(() => {
    if (!autoRefresh) setLoading(activityLoading);
  }, [activityLoading, autoRefresh]);

  useEffect(() => {
    if (activityError) {
      setError(activityError.message);
    } else {
      setError(null);
    }
  }, [activityError]);

  const fetchActivity = useCallback(async () => {
    setOffset(0);
    await refetchActivity();
  }, [refetchActivity]);

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchActivity]);

  return {
    data,
    loading,
    error,
    setError,
    availableFilters,
    retryCount,
    setRetryCount,
    _maxRetries,
    setMaxRetries,
    _retryDelay,
    setRetryDelay,
    limit,
    setLimit,
    offset,
    setOffset,
    allEvents,
    orchestrationLogs,
    activeBotCount,
    fetchActivity,
    handleLoadMore,
  };
}
