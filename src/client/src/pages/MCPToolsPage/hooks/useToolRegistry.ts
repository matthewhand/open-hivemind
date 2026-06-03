/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import useUrlParams from '../../../hooks/useUrlParams';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { apiService } from '../../../services/api';
import type { MCPTool, RecentToolUsage, AlertState } from '../types';

interface MCPFavoritesPayload {
  favorites?: string[];
  recentlyUsed?: RecentToolUsage[];
  usageCounts?: Record<string, number>;
}

interface UseToolRegistryProps {
  setAlert: (alert: AlertState | null) => void;
}

export function useToolRegistry({ setAlert }: UseToolRegistryProps): {
  tools: MCPTool[];
  filteredTools: MCPTool[];
  loading: boolean;
  handleToggleFavorite: (id: string) => void;
  searchQuery: string;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedServer: string;
  setSelectedServer: (v: string) => void;
  selectedView: string;
  setSelectedView: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  setSearchQuery: (v: string) => void;
  setFilteredTools: React.Dispatch<React.SetStateAction<MCPTool[]>>;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  recentlyUsed: RecentToolUsage[];
  setRecentlyUsed: React.Dispatch<React.SetStateAction<RecentToolUsage[]>>;
  usageCounts: Record<string, number>;
  setUsageCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
} {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    category: { type: 'string', default: 'all' },
    server: { type: 'string', default: 'all' },
    view: { type: 'string', default: 'all' },
    sortBy: { type: 'string', default: 'name' }
  });

  const [favorites, setFavorites] = useLocalStorage<string[]>('mcp-tools-favorites', []);
  const [recentlyUsed, setRecentlyUsed] = useLocalStorage<RecentToolUsage[]>('mcp-tools-recently-used', []);
  const [usageCounts, setUsageCounts] = useLocalStorage<Record<string, number>>('mcp-tools-usage-counts', {});

  // Server-side persistence so favorites / recents / usage-counts survive across
  // devices and sessions. We hydrate from the server on mount (falling back to
  // the localStorage values when the request fails) and persist changes back.
  // `hydratedRef` guards against the initial-state save overwriting server data.
  const hydratedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp: any = await apiService.get('/api/mcp/tools/favorites');
        const data: MCPFavoritesPayload = resp?.data ?? {};
        if (cancelled) return;
        if (Array.isArray(data.favorites)) setFavorites(data.favorites);
        if (Array.isArray(data.recentlyUsed)) setRecentlyUsed(data.recentlyUsed);
        if (data.usageCounts && typeof data.usageCounts === 'object') setUsageCounts(data.usageCounts);
      } catch {
        // Server unavailable — keep the localStorage-backed values as fallback.
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist registry preferences back to the server whenever they change
  // (after the initial hydration). Debounced to coalesce rapid updates.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const handle = setTimeout(() => {
      apiService
        .put('/api/mcp/tools/favorites', { favorites, recentlyUsed, usageCounts })
        .catch(() => {
          // Ignore persistence errors — localStorage still holds the values.
        });
    }, 500);
    return () => clearTimeout(handle);
  }, [favorites, recentlyUsed, usageCounts]);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const json: any = await apiService.get('/api/mcp/servers');
        const prefsJson: any = await apiService.get('/api/mcp/tools/preferences').catch(() => ({ success: true, data: {} }));

        // Performance optimization: pre-compute map for O(1) lookups instead of calling .find() inside loops
        const recentUsedMap = new Map(recentlyUsed.map(r => [r.toolId, r.timestamp]));

        const allTools: MCPTool[] = [];
        (json.servers || json.data?.servers || []).forEach((server: any) => {
          if (server.tools && Array.isArray(server.tools)) {
            server.tools.forEach((t: any) => {
              const toolId = `${server.name}-${t.name}`;
              allTools.push({
                id: toolId,
                name: t.name,
                serverId: server.name,
                serverName: server.name,
                description: t.description || 'No description available',
                category: 'utility',
                inputSchema: t.inputSchema,
                outputSchema: t.outputSchema || t.output_schema || {},
                usageCount: usageCounts[toolId] || 0,
                lastUsed: recentUsedMap.get(toolId),
                enabled: prefsJson.data?.[toolId] ? prefsJson.data[toolId].enabled : server.connected
              });
            });
          }
        });
        setTools(allTools);
        setFilteredTools(allTools);
      } catch {
        setAlert({ type: 'error', message: 'Failed to load tools' });
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, [usageCounts, recentlyUsed]);

  useEffect(() => {
    let filtered = [...tools];
    if (urlParams.view === 'favorites') {
      // Performance optimization: use Set for O(1) lookups
      const favoritesSet = new Set(favorites);
      filtered = filtered.filter(t => favoritesSet.has(t.id));
    }
    else if (urlParams.view === 'recent') {
      // Performance optimization: use Set for O(1) lookups instead of mapping and includes inside filter
      const recentIdsSet = new Set(recentlyUsed.map(r => r.toolId));
      filtered = filtered.filter(t => recentIdsSet.has(t.id));
    }

    if (urlParams.search) filtered = filtered.filter(t => t.name.toLowerCase().includes(urlParams.search.toLowerCase()) || t.description.toLowerCase().includes(urlParams.search.toLowerCase()));
    if (urlParams.category !== 'all') filtered = filtered.filter(t => t.category === urlParams.category);
    if (urlParams.server !== 'all') filtered = filtered.filter(t => t.serverId === urlParams.server);

    if (urlParams.sortBy === 'usage') filtered.sort((a, b) => b.usageCount - a.usageCount);
    else if (urlParams.sortBy === 'recent') filtered.sort((a, b) => (b.lastUsed ? new Date(b.lastUsed).getTime() : 0) - (a.lastUsed ? new Date(a.lastUsed).getTime() : 0));
    else filtered.sort((a, b) => a.name.localeCompare(b.name));

    setFilteredTools(filtered);
  }, [tools, urlParams, favorites, recentlyUsed]);

  const handleToggleTool = async (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;
    try {
      await apiService.post(`/api/mcp/tools/${toolId}/toggle`, { enabled: !tool.enabled, serverName: tool.serverName, toolName: tool.name });
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: !tool.enabled } : t));
    } catch {
      setAlert({ type: 'error', message: 'Failed to update tool' });
    }
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return {
    tools,
    filteredTools,
    loading,
    urlParams,
    setUrlParam,
    favorites,
    recentlyUsed,
    usageCounts,
    setUsageCounts,
    setRecentlyUsed,
    handleToggleTool,
    handleToggleFavorite,
  };
}
