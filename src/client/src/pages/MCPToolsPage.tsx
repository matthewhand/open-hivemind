/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  WrenchScrewdriverIcon as ToolIcon,
  PlayIcon as RunIcon,
  MagnifyingGlassIcon as SearchIcon,
  CodeBracketIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs, Alert, Modal } from '../components/DaisyUI';

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

  const breadcrumbItems = [
    { label: 'MCP', href: '/uber/mcp' },
    { label: 'Tools', href: '/uber/mcp/tools', isActive: true },
  ];

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
  const [inputMode, setInputMode] = useState<'form' | 'json'>('form');

  const handleOpenRunModal = (tool: MCPTool) => {
    setSelectedTool(tool);
    setRunArgs('{}');
    setJsonError(null);
    setInputMode('form');
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

  const updateField = (key: string, value: any) => {
    try {
      const current = JSON.parse(runArgs);
      current[key] = value;
      setRunArgs(JSON.stringify(current, null, 2));
    } catch (e) {
      // Should not happen in form mode if runArgs is valid JSON
      console.error('Error updating field:', e);
      // Fallback: reset to basic object with new key
      const newObj: any = {};
      newObj[key] = value;
      setRunArgs(JSON.stringify(newObj, null, 2));
    }
  };

  const renderFormInputs = () => {
    if (!selectedTool?.inputSchema?.properties) {
      return <div className="text-base-content/60 italic p-4 text-center">No arguments required for this tool.</div>;
    }

    let currentArgs: any = {};
    try {
      currentArgs = JSON.parse(runArgs);
    } catch (e) {
      currentArgs = {};
    }

    return (
      <div className="space-y-4">
        {Object.entries(selectedTool.inputSchema.properties).map(([key, schema]: [string, any]) => {
          const isRequired = selectedTool.inputSchema.required?.includes(key);
          const value = currentArgs[key] !== undefined ? currentArgs[key] : '';

          return (
            <div key={key} className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">
                  {key}
                  {isRequired && <span className="text-error ml-1">*</span>}
                </span>
              </label>

              {schema.type === 'boolean' ? (
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={!!value}
                  onChange={(e) => updateField(key, e.target.checked)}
                />
              ) : schema.type === 'integer' || schema.type === 'number' ? (
                <input
                  type="number"
                  className="input input-bordered w-full"
                  placeholder={schema.description || `Enter ${key}`}
                  value={value}
                  onChange={(e) => updateField(key, Number(e.target.value))}
                />
              ) : (
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder={schema.description || `Enter ${key}`}
                  value={value}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              )}

              {schema.description && (
                <label className="label">
                  <span className="label-text-alt text-base-content/60">{schema.description}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading MCP tools...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">
          MCP Tools
        </h1>
        <p className="text-base-content/70">
          Browse and manage tools available from your MCP servers
        </p>
      </div>

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="form-control w-full md:w-auto md:flex-1 max-w-md">
          <div className="input-group">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search tools..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon className="w-5 h-5 absolute left-3 top-3 text-base-content/50" />
            </div>
          </div>
        </div>

        <select
          className="select select-bordered w-full md:w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered w-full md:w-auto"
          value={serverFilter}
          onChange={(e) => setServerFilter(e.target.value)}
        >
          <option value="all">All Servers</option>
          {servers.map(server => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-base-content/70 mb-4">
        Showing {filteredTools.length} of {tools.length} tools
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div key={tool.id} className="card bg-base-100 shadow-xl h-full">
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <ToolIcon className="w-5 h-5 text-base-content/70" />
                  <h2 className="card-title text-lg">
                    {tool.name}
                  </h2>
                </div>
                <div className={`badge ${tool.enabled ? 'badge-success' : 'badge-ghost'}`}>
                  {tool.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <p className="text-sm text-base-content/70 mb-4">
                {tool.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className={`badge ${getCategoryColor(tool.category)}`}>
                  {tool.category}
                </div>
                <div className="badge badge-outline">{tool.serverName}</div>
              </div>

              <div className="text-xs space-y-1 mb-4">
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
                  <RunIcon className="w-4 h-4 mr-1" />
                  Run Tool
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && !loading && (
        <div className="text-center mt-12">
          <h3 className="text-lg font-medium text-base-content/70">
            No tools found
          </h3>
          <p className="text-sm text-base-content/50 mt-1">
            Try adjusting your search criteria or add more MCP servers
          </p>
        </div>
      )}

      {selectedTool && (
        <Modal
          isOpen={!!selectedTool}
          onClose={handleCloseRunModal}
          title={`Run Tool: ${selectedTool.name}`}
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

            <div className="flex justify-end gap-2 mb-2">
              <div className="join">
                <button
                  className={`join-item btn btn-sm ${inputMode === 'form' ? 'btn-active btn-primary' : ''}`}
                  onClick={() => setInputMode('form')}
                  title="Form Mode"
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
                <button
                  className={`join-item btn btn-sm ${inputMode === 'json' ? 'btn-active btn-primary' : ''}`}
                  onClick={() => setInputMode('json')}
                  title="JSON Mode"
                >
                  <CodeBracketIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {inputMode === 'form' ? (
              <div className="bg-base-200 p-4 rounded-lg">
                 {renderFormInputs()}
              </div>
            ) : (
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
            )}

            {inputMode === 'form' && (
              <div className="collapse collapse-arrow bg-base-100 border border-base-200">
                <input type="checkbox" />
                <div className="collapse-title text-sm font-medium opacity-70">
                  View Generated JSON
                </div>
                <div className="collapse-content">
                  <pre className="text-xs font-mono bg-base-300 p-2 rounded overflow-x-auto">
                    {runArgs}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MCPToolsPage;
