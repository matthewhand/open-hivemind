/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Alert } from '../components/DaisyUI/Alert';
import Modal from '../components/DaisyUI/Modal';
import ToolResultModal from '../components/ToolResultModal';
import useUrlParams from '../hooks/useUrlParams';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { apiService } from '../services/api';
import { ToolRegistryPanel, ToolExecutionPanel, MCPTool, ToolExecutionRecord, ToolResult, RecentToolUsage } from '../components/mcp-tools';

const MCPToolsPage: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({ search: { type: 'string', default: '', debounce: 300 }, category: { type: 'string', default: 'all' }, server: { type: 'string', default: 'all' }, view: { type: 'string', default: 'all' }, sortBy: { type: 'string', default: 'name' } });
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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

      setSelectedResult({ timestamp: new Date().toISOString(), toolName: tool.name, serverName: tool.serverName, arguments: args, result: json.result, isError: false });
      setShowResultModal(true);
      if (validationWarnings.length > 0) setAlert({ type: 'success', message: `Tool executed with schema validation warnings: ${validationWarnings.join(', ')}` });

      setUsageCounts(prev => ({ ...prev, [tool.id]: (prev[tool.id] || 0) + 1 }));
      setRecentlyUsed(prev => [{ toolId: tool.id, timestamp: new Date().toISOString(), arguments: args }, ...prev.filter(r => r.toolId !== tool.id)].slice(0, 10));
    } catch (err: any) {
      setSelectedResult({ timestamp: new Date().toISOString(), toolName: tool.name, serverName: tool.serverName, arguments: args, error: { message: err.message }, isError: true });
      setShowResultModal(true);
    } finally { setIsRunning(false); setSelectedTool(null); }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try { const json: any = await apiService.get('/api/mcp/tools/history?limit=50'); setExecutionHistory(json.data || []); }
    catch { setAlert({ type: 'error', message: 'Failed to load history' }); }
    finally { setLoadingHistory(false); }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-start">
        <div><h1 className="text-3xl font-bold mb-2">MCP Tools</h1><p className="text-base-content/70">Browse and manage tools available from your MCP servers</p></div>
        <button className="btn btn-outline btn-sm" onClick={() => { setShowHistory(true); fetchHistory(); }}><ClockIcon className="w-4 h-4 mr-1" /> Execution History</button>
      </div>
      {alert && <div className="mb-6"><Alert status={alert.type === 'success' ? 'success' : 'error'} message={alert.message} onClose={() => setAlert(null)} /></div>}
      <ToolRegistryPanel
        tools={tools} filteredTools={filteredTools} loading={loading} favorites={favorites} recentlyUsed={recentlyUsed}
        onToggleFavorite={(id) => setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])}
        onToggleTool={handleToggleTool} onRunTool={(tool, args) => { setSelectedTool(tool); setInitialArgs(args); }}
        searchTerm={urlParams.search} setSearchTerm={(v) => setUrlParam('search', v)}
        categoryFilter={urlParams.category} setCategoryFilter={(v) => setUrlParam('category', v)}
        serverFilter={urlParams.server} setServerFilter={(v) => setUrlParam('server', v)}
        viewFilter={urlParams.view} setViewFilter={(v) => setUrlParam('view', v)}
        sortBy={urlParams.sortBy} setSortBy={(v) => setUrlParam('sortBy', v)}
        categories={Array.from(new Set(tools.map(t => t.category)))}
        servers={Array.from(new Set(tools.map(t => ({ id: t.serverId, name: t.serverName }))))}
      />
      <ToolExecutionPanel tool={selectedTool} onClose={() => setSelectedTool(null)} onExecute={handleExecuteTool} isRunning={isRunning} initialArgs={initialArgs} />
      {showHistory && (
        <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Tool Execution History" size="xl">
          <div className="space-y-4">
            {loadingHistory ? <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg"></span></div> : executionHistory.length === 0 ? <div className="text-center py-8"><p className="text-base-content/70">No execution history found</p></div> : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead><tr><th>Status</th><th>Tool</th><th>Server</th><th>Duration</th><th>Executed At</th><th>Details</th></tr></thead>
                  <tbody>
                    {executionHistory.map((r) => (
                      <tr key={r.id}>
                        <td>{r.status === 'success' ? <div className="flex items-center gap-1 text-success"><CheckCircleIcon className="w-5 h-5" /><span>Success</span></div> : <div className="flex items-center gap-1 text-error"><XCircleIcon className="w-5 h-5" /><span>Error</span></div>}</td>
                        <td><div className="font-medium">{r.toolName}</div></td>
                        <td><div className="badge badge-outline badge-sm">{r.serverName}</div></td>
                        <td>{r.duration}ms</td>
                        <td><div className="text-sm">{new Date(r.executedAt).toLocaleString()}</div></td>
                        <td>
                          <details className="collapse collapse-arrow bg-base-200">
                            <summary className="collapse-title text-xs font-medium cursor-pointer min-h-0 py-2">View</summary>
                            <div className="collapse-content text-xs"><div className="space-y-2 pt-2"><div><strong>Arguments:</strong><pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(r.arguments, null, 2)}</pre></div>{r.status === 'success' ? <div><strong>Result:</strong><pre className="bg-base-300 p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(r.result, null, 2)}</pre></div> : <div><strong>Error:</strong><div className="bg-error/10 text-error p-2 rounded mt-1">{r.error}</div></div>}</div></div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-xs text-base-content/60 text-center pt-4">Showing last 50 executions (retention: 1000 max)</div>
          </div>
        </Modal>
      )}
      {selectedResult && <ToolResultModal isOpen={showResultModal} onClose={() => setShowResultModal(false)} result={selectedResult} />}
    </div>
  );
};
export default MCPToolsPage;
