/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Play,
  Search,
} from 'lucide-react';
import { Alert, Modal, PageHeader, EmptyState } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';

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
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch('/api/mcp/servers');
        if (res.ok) {
          const json = await res.json();
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
        }
      } catch (err) {
        console.error('Failed to fetch MCP tools:', err);
        setAlert({ type: 'error', message: 'Failed to load tools from server' });
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  useEffect(() => {
    let filtered = tools;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase()),
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

  const handleOpenRunModal = (tool: MCPTool) => {
    setSelectedTool(tool);
    setRunArgs('{}');
    setJsonError(null);
  };

  const handleCloseRunModal = () => {
    if (isRunning) return;
    setSelectedTool(null);
    setRunArgs('{}');
    setJsonError(null);
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
    try {
      const res = await fetch(`/api/mcp/servers/${selectedTool.serverName}/call-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolName: selectedTool.name,
          arguments: args,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute tool');
      }

      const json = await res.json();
      console.log('Tool execution result:', json);

      // Update usage count
      setTools(prev => prev.map(t =>
        t.id === selectedTool.id
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t,
      ));

      handleCloseRunModal();
      setAlert({ type: 'success', message: `Tool executed! Result: ${JSON.stringify(json.result).substring(0, 100)}...` });
    } catch (error: any) {
      console.error('Tool execution error:', error);
      setAlert({ type: 'error', message: `Failed to execute tool: ${error.message}` });
      handleCloseRunModal();
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleTool = async (toolId: string) => {
    try {
      setTools(prev => prev.map(tool =>
        tool.id === toolId
          ? { ...tool, enabled: !tool.enabled }
          : tool,
      ));
      setAlert({ type: 'success', message: 'Tool status updated' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update tool status' });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <span className="loading loading-infinity loading-lg text-primary" />
        <span className="text-base-content/50">Loading MCP tools...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Tools"
        description="Browse and manage tools available from your MCP servers"
        icon={Wrench}
      />

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filters */}
      <SearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tools..."
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { value: 'all', label: 'All Categories' },
              ...categories.map(category => ({
                value: category,
                label: category.charAt(0).toUpperCase() + category.slice(1)
              }))
            ]
          },
          {
            key: 'server',
            value: serverFilter,
            onChange: setServerFilter,
            options: [
              { value: 'all', label: 'All Servers' },
              ...servers.map(server => ({
                value: server.id,
                label: server.name
              }))
            ]
          }
        ]}
      />

      <div className="flex justify-between items-center text-sm text-base-content/70">
        <p>Showing {filteredTools.length} of {tools.length} tools</p>
      </div>

      {filteredTools.length === 0 ? (
        <EmptyState
            icon={Search}
            title={tools.length === 0 ? "No tools found" : "No matches found"}
            description={tools.length === 0 ? "Connect an MCP server to see available tools." : "Try adjusting your search or filters."}
            actionLabel="Clear Search"
            onAction={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setServerFilter('all');
            }}
            variant={tools.length === 0 ? "noData" : "noResults"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
            <div key={tool.id} className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow h-full">
                <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    <h2 className="card-title text-lg">
                        {tool.name}
                    </h2>
                    </div>
                    <div className={`badge ${tool.enabled ? 'badge-success' : 'badge-ghost'}`}>
                    {tool.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                </div>

                <p className="text-sm text-base-content/70 mb-4 line-clamp-2 min-h-[40px]">
                    {tool.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    <div className={`badge ${getCategoryColor(tool.category)}`}>
                    {tool.category}
                    </div>
                    <div className="badge badge-outline">{tool.serverName}</div>
                </div>

                <div className="text-xs space-y-1 mb-4 bg-base-200/50 p-2 rounded">
                    <p><strong>Usage:</strong> {tool.usageCount} times</p>
                    {tool.lastUsed && (
                    <p className="text-base-content/50">
                        Last used: {new Date(tool.lastUsed).toLocaleString()}
                    </p>
                    )}
                </div>

                <div className="card-actions justify-between mt-auto">
                    <button
                    className={`btn btn-sm ${tool.enabled ? 'btn-error btn-outline' : 'btn-success btn-outline'}`}
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
              label: 'Cancel',
              onClick: handleCloseRunModal,
              variant: 'ghost',
              disabled: isRunning,
            },
            {
              label: isRunning ? 'Running...' : 'Run Tool',
              onClick: handleExecuteTool,
              variant: 'primary',
              loading: isRunning,
              disabled: isRunning,
            },
          ]}
        >
          <div className="space-y-4">
            <p className="text-base-content/70 text-sm">
              {selectedTool.description}
            </p>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Input Schema</span>
              </label>
              <div className="mockup-code bg-base-300 text-xs p-0 min-h-0">
                <pre className="p-4 overflow-x-auto">
                  <code>{JSON.stringify(selectedTool.inputSchema, null, 2)}</code>
                </pre>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Arguments (JSON)</span>
              </label>
              <textarea
                className={`textarea textarea-bordered h-32 font-mono text-sm ${jsonError ? 'textarea-error' : ''}`}
                value={runArgs}
                onChange={(e) => {
                  setRunArgs(e.target.value);
                  if (jsonError) setJsonError(null);
                }}
                placeholder="{}"
                disabled={isRunning}
              />
              {jsonError && (
                <label className="label">
                  <span className="label-text-alt text-error">{jsonError}</span>
                </label>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MCPToolsPage;
