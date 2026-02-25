/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Play,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Box,
} from 'lucide-react';
import {
  Modal,
  PageHeader,
  EmptyState,
} from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { apiService } from '../services/api';

interface MCPTool {
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

const MCPToolsPage: React.FC = () => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [filteredTools, setFilteredTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serverFilter, setServerFilter] = useState('all');

  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const json = await apiService.getMcpServers();
      const servers = json.servers || [];

      // Flatten structure: Server[] -> Tool[]
      const allTools: MCPTool[] = [];
      servers.forEach((server: any) => {
        if (server.tools && Array.isArray(server.tools)) {
          server.tools.forEach((t: any) => {
            allTools.push({
              id: `${server.name}-${t.name}`,
              name: t.name,
              serverId: server.name, // Using name as ID for consistency with API
              serverName: server.name,
              description: t.description || 'No description available',
              category: 'utility', // Default category as API doesn't provide it yet
              inputSchema: t.inputSchema,
              outputSchema: {},
              usageCount: 0,
              enabled: server.connected,
            });
          });
        }
      });

      setTools(allTools);
      setFilteredTools(allTools);
    } catch (err: any) {
      console.error('Failed to fetch MCP tools:', err);
      showError(err.message || 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = tools;

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(lowerSearch) ||
        tool.description.toLowerCase().includes(lowerSearch),
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    // Apply server filter
    if (serverFilter !== 'all') {
      filtered = filtered.filter(tool => tool.serverId === serverFilter);
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, categoryFilter, serverFilter]);

  const categories = Array.from(new Set(tools.map(tool => tool.category)));
  const servers = Array.from(new Set(tools.map(tool => ({ id: tool.serverId, name: tool.serverName }))));

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      git: 'badge-primary',
      database: 'badge-secondary',
      filesystem: 'badge-info',
      network: 'badge-success',
      ai: 'badge-warning',
      utility: 'badge-ghost',
    };
    return colors[category] || 'badge-ghost';
  };

  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [runArgs, setRunArgs] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  const handleOpenRunModal = (tool: MCPTool) => {
    setSelectedTool(tool);
    setRunArgs('{}');
    setJsonError(null);
    setExecutionResult(null);
  };

  const handleCloseRunModal = () => {
    if (isRunning) return;
    setSelectedTool(null);
    setRunArgs('{}');
    setJsonError(null);
    setExecutionResult(null);
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;

    let args = {};
    try {
      args = JSON.parse(runArgs);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON format');
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    try {
      const result = await apiService.callMcpTool(selectedTool.serverName, selectedTool.name, args);

      console.log('Tool execution result:', result);

      // Update usage count locally
      setTools(prev => prev.map(t =>
        t.id === selectedTool.id
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t,
      ));

      setExecutionResult(JSON.stringify(result, null, 2));
      showSuccess('Tool executed successfully');
    } catch (error: any) {
      console.error('Tool execution error:', error);
      showError(`Failed to execute tool: ${error.message}`);
      setExecutionResult(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleTool = async (toolId: string) => {
    // In a real implementation, this would call an API endpoint to toggle the tool status
    // For now, just update local state
    try {
      setTools(prev => prev.map(tool =>
        tool.id === toolId
          ? { ...tool, enabled: !tool.enabled }
          : tool,
      ));
      showSuccess('Tool status updated');
    } catch (error) {
      showError('Failed to update tool status');
    }
  };

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
  ];

  const serverOptions = [
    { value: 'all', label: 'All Servers' },
    ...servers.map(s => ({ value: s.id, label: s.name }))
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Tools"
        description={`Browse and manage tools available from your MCP servers (${tools.length} total)`}
        icon={Wrench}
        actions={
          <button onClick={fetchTools} className="btn btn-ghost btn-sm" disabled={loading} title="Refresh Tools">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <SearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tools..."
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
          },
          {
            key: 'server',
            value: serverFilter,
            onChange: setServerFilter,
            options: serverOptions,
          },
        ]}
      />

      {loading && filteredTools.length === 0 ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredTools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={tools.length === 0 ? "No Tools Found" : "No Matches Found"}
          description={tools.length === 0 ? "Connect an MCP server to discover tools." : "Try adjusting your search or filters."}
          actionLabel={tools.length === 0 ? "Refresh" : "Clear Filters"}
          onAction={tools.length === 0 ? fetchTools : () => { setSearchTerm(''); setCategoryFilter('all'); setServerFilter('all'); }}
          variant={tools.length === 0 ? "noData" : "noResults"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div key={tool.id} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow h-full flex flex-col">
              <div className="card-body p-5 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Wrench className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="card-title text-lg truncate" title={tool.name}>
                      {tool.name}
                    </h2>
                  </div>
                  <div className={`badge ${tool.enabled ? 'badge-success badge-outline' : 'badge-ghost badge-outline'} gap-1`}>
                    {tool.enabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {tool.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                <p className="text-sm text-base-content/70 mb-4 line-clamp-3 min-h-[3rem]">
                  {tool.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge ${getCategoryColor(tool.category)} badge-sm`}>
                    {tool.category}
                  </div>
                  <div className="badge badge-neutral badge-outline badge-sm flex gap-1 items-center">
                    <Box className="w-3 h-3" />
                    {tool.serverName}
                  </div>
                </div>

                <div className="text-xs space-y-1 mt-auto pt-4 border-t border-base-200">
                  <div className="flex justify-between text-base-content/60">
                    <span>Usage Count:</span>
                    <span className="font-mono">{tool.usageCount}</span>
                  </div>
                  {tool.lastUsed && (
                    <div className="flex justify-between text-base-content/60">
                      <span>Last Used:</span>
                      <span>{new Date(tool.lastUsed).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions p-4 bg-base-200/50 justify-between items-center border-t border-base-200 rounded-b-box">
                <button
                  className={`btn btn-xs ${tool.enabled ? 'btn-ghost text-error' : 'btn-ghost text-success'}`}
                  onClick={() => handleToggleTool(tool.id)}
                >
                  {tool.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleOpenRunModal(tool)}
                  disabled={!tool.enabled}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Run Tool
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTool && (
        <Modal
          isOpen={!!selectedTool}
          onClose={handleCloseRunModal}
          title={`Run Tool: ${selectedTool.name}`}
          size="lg"
          actions={[
            {
              label: 'Close',
              onClick: handleCloseRunModal,
              variant: 'ghost',
              disabled: isRunning,
            },
            {
              label: isRunning ? 'Running...' : 'Execute',
              onClick: handleExecuteTool,
              variant: 'primary',
              loading: isRunning,
              disabled: isRunning,
            },
          ]}
        >
          <div className="space-y-4">
            <div className="bg-base-200 p-4 rounded-lg flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-info mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Description</h4>
                <p className="text-sm text-base-content/70 mt-1">
                  {selectedTool.description}
                </p>
              </div>
            </div>

            <div className="divider">Configuration</div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Input Schema</span>
                <span className="label-text-alt text-base-content/50">Read-only</span>
              </label>
              <div className="mockup-code bg-base-300 text-xs p-0 min-h-0 max-h-40 overflow-y-auto">
                <pre className="p-4">
                  <code>{JSON.stringify(selectedTool.inputSchema, null, 2)}</code>
                </pre>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Arguments (JSON)</span>
                {jsonError && <span className="label-text-alt text-error font-medium">{jsonError}</span>}
              </label>
              <textarea
                className={`textarea textarea-bordered h-32 font-mono text-sm ${jsonError ? 'textarea-error' : ''}`}
                value={runArgs}
                onChange={(e) => {
                  setRunArgs(e.target.value);
                  if (jsonError) setJsonError(null);
                }}
                placeholder='{"key": "value"}'
                disabled={isRunning}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">Enter valid JSON arguments matching the schema above.</span>
              </label>
            </div>

            {executionResult && (
              <>
                <div className="divider">Result</div>
                <div className="form-control">
                  <div className="mockup-code bg-base-300 text-xs p-0 min-h-0 max-h-60 overflow-y-auto border border-base-content/10">
                    <pre className="p-4">
                      <code>{executionResult}</code>
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MCPToolsPage;
