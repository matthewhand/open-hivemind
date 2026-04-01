/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import useUrlParams from '../../../hooks/useUrlParams';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { apiService } from '../../../services/api';
import type { MCPTool, ToolExecutionRecord, ToolResult, RecentToolUsage, AlertState } from '../types';

export function useMCPTools() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({ search: { type: 'string', default: '', debounce: 300 }, category: { type: 'string', default: 'all' }, server: { type: 'string', default: 'all' }, view: { type: 'string', default: 'all' }, sortBy: { type: 'string', default: 'name' } });
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [favorites, setFavorites] = useLocalStorage<string[]>('mcp-tools-favorites', []);
  const [recentlyUsed, setRecentlyUsed] = useLocalStorage<RecentToolUsage[]>('mcp-tools-recently-used', []);
  const [usageCounts, setUsageCounts] = useLocalStorage<Record<string, number>>('mcp-tools-usage-counts', {});
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [initialArgs, setInitialArgs] = useState<Record<string, any>>();
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ToolExecutionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ToolResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [recentResults, setRecentResults] = useState<ToolResult[]>([]);

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
              allTools.push({ id: toolId, name: t.name, serverId: server.name, serverName: server.name, description: t.description || 'No description available', category: 'utility', inputSchema: t.inputSchema, outputSchema: t.outputSchema || t.output_schema || {}, usageCount: usageCounts[toolId] || 0, lastUsed: recentlyUsed.find(r => r.toolId === toolId)?.timestamp, enabled: prefsJson.data?.[toolId] ? prefsJson.data[toolId].enabled : server.connected });
            });
          }
        });
        setTools(allTools);
        setFilteredTools(allTools);
      } catch { setAlert({ type: 'error', message: 'Failed to load tools' }); } finally { setLoading(false); }
    };
    fetchTools();
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
    } catch { setAlert({ type: 'error', message: 'Failed to update tool' }); }
  };

  const handleExecuteTool = async (tool: MCPTool, args: Record<string, any>) => {
    setIsRunning(true);
    const start = Date.now();
    try {
      const json: any = await apiService.post(`/api/mcp/servers/${tool.serverName}/call-tool`, { toolName: tool.name, arguments: args });
      apiService.post('/api/mcp/tools/history', { id: crypto.randomUUID(), serverName: tool.serverName, toolName: tool.name, arguments: args, result: json.result, status: 'success', executedAt: new Date().toISOString(), duration: Date.now() - start }).catch(() => {});

      let validationWarnings: string[] = [];
      if (tool.outputSchema && Object.keys(tool.outputSchema).length > 0) {
        const output = json.result;
        const schema = tool.outputSchema;
        if (schema.type) {
            const outputType = Array.isArray(output) ? 'array' : typeof output;
            if (schema.type !== outputType && !(schema.type === 'object' && outputType === 'object')) validationWarnings.push(`Expected type ${schema.type}, got ${outputType}`);
        }
        if (schema.type === 'object' && schema.properties && schema.required) {
            (schema.required as string[]).forEach(prop => { if (!(prop in (output || {}))) validationWarnings.push(`Missing required property: ${prop}`); });
        }
      }

      const successResult: ToolResult = { timestamp: new Date().toISOString(), toolName: tool.name, serverName: tool.serverName, arguments: args, result: json.result, isError: false };
      setSelectedResult(successResult);
      setRecentResults(prev => [successResult, ...prev].slice(0, 20));
      setShowResultModal(true);
      if (validationWarnings.length > 0) setAlert({ type: 'success', message: `Tool executed with schema validation warnings: ${validationWarnings.join(', ')}` });

      setUsageCounts(prev => ({ ...prev, [tool.id]: (prev[tool.id] || 0) + 1 }));
      setRecentlyUsed(prev => [{ toolId: tool.id, timestamp: new Date().toISOString(), arguments: args }, ...prev.filter(r => r.toolId !== tool.id)].slice(0, 10));
    } catch (err: any) {
      const errorResult: ToolResult = { timestamp: new Date().toISOString(), toolName: tool.name, serverName: tool.serverName, arguments: args, error: { message: err.message }, isError: true };
      setSelectedResult(errorResult);
      setRecentResults(prev => [errorResult, ...prev].slice(0, 20));
      setShowResultModal(true);
    } finally { setIsRunning(false); setSelectedTool(null); }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try { const json: any = await apiService.get('/api/mcp/tools/history?limit=50'); setExecutionHistory(json.data || []); }
    catch { setAlert({ type: 'error', message: 'Failed to load history' }); }
    finally { setLoadingHistory(false); }
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleRunTool = (tool: MCPTool, args?: Record<string, any>) => {
    setSelectedTool(tool);
    setInitialArgs(args);
  };

  return {
    tools, filteredTools, loading, alert, setAlert,
    favorites, recentlyUsed,
    selectedTool, setSelectedTool, initialArgs, isRunning,
    showHistory, setShowHistory, executionHistory, loadingHistory,
    selectedResult, showResultModal, setShowResultModal,
    recentResults, setRecentResults,
    urlParams, setUrlParam,
    handleToggleTool, handleExecuteTool, fetchHistory,
    handleToggleFavorite, handleRunTool,
  };
}
