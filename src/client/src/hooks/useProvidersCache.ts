/**
 * Lightweight in-memory cache for provider profile lists.
 * Avoids duplicate API calls across components that all need the same data.
 * Cache is invalidated on explicit refetch or when configVersion changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { useWebSocket } from '../contexts/WebSocketContext';

interface ProvidersCache {
  llm: any[];
  message: any[];
  memory: any[];
  tool: any[];
}

// Module-level cache shared across all hook instances
let cache: Partial<ProvidersCache> = {};
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

export function invalidateProvidersCache(type?: keyof ProvidersCache) {
  if (type) {
    delete cache[type];
  } else {
    cache = {};
  }
  notify();
}

export function useLLMProfiles() {
  const [profiles, setProfiles] = useState<any[]>(cache.llm ?? []);
  const [loading, setLoading] = useState(!cache.llm);
  const { configVersion, lastConfigChange } = useWebSocket();

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/api/config/llm-profiles') as any;
      const list = res?.llm || res?.profiles?.llm || res?.data || [];
      cache.llm = list;
      setProfiles(list);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — only fetches once on mount
  useEffect(() => {
    if (!cache.llm) fetchProfiles();
    else setProfiles(cache.llm);
  }, [fetchProfiles]);

  // Invalidate only when a relevant config change arrives via WebSocket.
  // Uses a ref to skip the initial run (configVersion doesn't "change" on mount).
  const configVersionRef = useRef(configVersion);
  useEffect(() => {
    if (configVersionRef.current === configVersion) return;
    configVersionRef.current = configVersion;
    // Only refetch if the change was specifically for llm-profiles
    if (lastConfigChange?.type && lastConfigChange.type !== 'llm-profiles') return;
    delete cache.llm;
    fetchProfiles();
  }, [configVersion, lastConfigChange, fetchProfiles]);

  // Subscribe to manual cache invalidations (e.g. after a profile is saved)
  useEffect(() => {
    const update = () => {
      if (!cache.llm) fetchProfiles();
      else setProfiles(cache.llm);
    };
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, [fetchProfiles]);

  return { profiles, loading, refetch: fetchProfiles };
}
