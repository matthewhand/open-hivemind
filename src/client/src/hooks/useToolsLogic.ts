/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { apiService } from '../services/api';
import Debug from 'debug';

const debug = Debug('app:client:hooks:useToolsLogic');

export interface MCPTool {
  id: string;
  name: string;
  serverId: string;
  serverName: string;
  description: string;
  category: string;
  inputSchema: any;
  outputSchema: any;
  usageCount: number;
  lastUsed?: string;
  enabled: boolean;
}

export interface ToolExecutionRecord {
  id: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  error?: string;
  status: 'success' | 'error';
  executedAt: string;
  duration: number;
  userId?: string;
}

export interface ToolResult {
  timestamp: string;
  toolName: string;
  serverName: string;
  arguments: any;
  result?: any;
  error?: {
    message: string;
    stack?: string;
  };
  isError: boolean;
}

export interface RecentToolUsage {
  toolId: string;
  timestamp: string;
  arguments?: Record<string, any>;
}

export const useToolsLogic = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // LocalStorage-persisted state
  const [favorites, setFavorites] = useLocalStorage<string[]>('mcp-tools-favorites', []);
  const [recentlyUsed, setRecentlyUsed] = useLocalStorage<RecentToolUsage[]>('mcp-tools-recently-used', []);
  const [usageCounts, setUsageCounts] = useLocalStorage<Record<string, number>>('mcp-tools-usage-counts', {});

  // Tool result state
  const [resultHistory, setResultHistory] = useState<ToolResult[]>([]);

  // Execution history
  const [executionHistory, setExecutionHistory] = useState<ToolExecutionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const json: any = await apiService.get('/api/mcp/servers');
        const servers = json.servers || [];

        const prefsJson: any = await apiService.get('/api/mcp/tools/preferences').catch(() => ({ success: true, data: {} }));
        const preferences = prefsJson.data || {};

        const allTools: MCPTool[] = [];
        servers.forEach((server: any) => {
          if (server.tools && Array.isArray(server.tools)) {
            server.tools.forEach((t: any) => {
              const toolId = `${server.name}-${t.name}`;
              const preference = preferences[toolId];

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
                enabled: preference ? preference.enabled : server.connected,
              });
            });
          }
        });

        setTools(allTools);
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to load tools from server' });
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, [usageCounts, recentlyUsed]);

  const recentTools = useMemo(() => {
    const recentIds = recentlyUsed.slice(0, 5).map(r => r.toolId);
    return tools.filter(tool => recentIds.includes(tool.id))
      .sort((a, b) => {
        const aIndex = recentIds.indexOf(a.id);
        const bIndex = recentIds.indexOf(b.id);
        return aIndex - bIndex;
      });
  }, [tools, recentlyUsed]);

  const favoriteTools = useMemo(() => {
    return tools.filter(tool => favorites.includes(tool.id));
  }, [tools, favorites]);

  const handleToggleFavorite = useCallback((toolId: string) => {
    setFavorites(prev => {
      if (prev.includes(toolId)) {
        return prev.filter(id => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  }, [setFavorites]);

  const handleToggleTool = async (toolId: string) => {
    try {
      const tool = tools.find(t => t.id === toolId);
      if (!tool) {
        setAlert({ type: 'error', message: 'Tool not found' });
        return;
      }

      const newEnabledState = !tool.enabled;

      await apiService.post(`/api/mcp/tools/${toolId}/toggle`, {
        enabled: newEnabledState,
        serverName: tool.serverName,
        toolName: tool.name,
      });

      setTools(prev => prev.map(t =>
        t.id === toolId
          ? { ...t, enabled: newEnabledState }
          : t,
      ));
      setAlert({ type: 'success', message: `Tool ${newEnabledState ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update tool status' });
    }
  };

  const updateToolUsage = useCallback((toolId: string, args: Record<string, any>) => {
    const newUsageCount = (usageCounts[toolId] || 0) + 1;
    setUsageCounts(prev => ({
      ...prev,
      [toolId]: newUsageCount,
    }));

    setRecentlyUsed(prev => {
      const filtered = prev.filter(r => r.toolId !== toolId);
      return [
        { toolId, timestamp: new Date().toISOString(), arguments: args },
        ...filtered
      ].slice(0, 10);
    });

    setTools(prev => prev.map(t =>
      t.id === toolId
        ? { ...t, usageCount: newUsageCount, lastUsed: new Date().toISOString() }
        : t,
    ));
  }, [usageCounts, setUsageCounts, setRecentlyUsed]);

  const fetchExecutionHistory = async () => {
    setLoadingHistory(true);
    try {
      const json: any = await apiService.get('/api/mcp/tools/history?limit=50');
      setExecutionHistory(json.data || []);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to load execution history' });
    } finally {
      setLoadingHistory(false);
    }
  };

  return {
    tools,
    setTools,
    loading,
    alert,
    setAlert,
    favorites,
    handleToggleFavorite,
    recentlyUsed,
    recentTools,
    favoriteTools,
    handleToggleTool,
    updateToolUsage,
    resultHistory,
    setResultHistory,
    executionHistory,
    loadingHistory,
    fetchExecutionHistory,
  };
};
