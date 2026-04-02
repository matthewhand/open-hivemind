/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import useUrlParams from '../../../hooks/useUrlParams';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { apiService } from '../../../services/api';
import type { MCPTool, RecentToolUsage, AlertState } from '../types';

interface UseToolRegistryProps {
  setAlert: (alert: AlertState | null) => void;
}

export function useToolRegistry({ setAlert }: UseToolRegistryProps) {
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

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const json: any = await apiService.get('/api/mcp/servers');
        const prefsJson: any = await apiService.get('/api/mcp/tools/preferences').catch(() => ({ success: true, data: {} }));
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
                lastUsed: recentlyUsed.find(r => r.toolId === toolId)?.timestamp,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageCounts, recentlyUsed]);

  useEffect(() => {
    let filtered = [...tools];
    if (urlParams.view === 'favorites') filtered = filtered.filter(t => favorites.includes(t.id));
    else if (urlParams.view === 'recent') filtered = filtered.filter(t => recentlyUsed.map(r => r.toolId).includes(t.id));

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
