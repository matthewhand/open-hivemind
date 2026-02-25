/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Play,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Server,
  Zap,
  Grid,
} from 'lucide-react';
import { Breadcrumbs, Alert, Modal, PageHeader, StatsCards, EmptyState } from '../components/DaisyUI';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serverFilter, setServerFilter] = useState('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'MCP', href: '/admin/mcp' },
    { label: 'Tools', href: '/admin/mcp/tools', isActive: true },
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

  const filteredTools = useMemo(() => {
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

    return filtered;
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

  // Calculate stats
  const totalTools = tools.length;
  const enabledTools = tools.filter(t => t.enabled).length;
  const uniqueCategories = new Set(tools.map(t => t.category)).size;
  const uniqueServers = new Set(tools.map(t => t.serverId)).size;

  const stats = [
    {
      id: 'total-tools',
      title: 'Total Tools',
      value: totalTools,
      icon: <Wrench className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'enabled-tools',
      title: 'Enabled',
      value: enabledTools,
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'success' as const,
    },
    {
      id: 'servers',
      title: 'Servers',
      value: uniqueServers,
      icon: <Server className="w-8 h-8" />,
      color: 'info' as const,
    },
    {
      id: 'categories',
      title: 'Categories',
      value: uniqueCategories,
      icon: <Grid className="w-8 h-8" />,
      color: 'accent' as const,
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading MCP tools...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumbs removed as PageHeader provides context */}

      {/* Header */}
      <PageHeader
        title="MCP Tools"
        description="Browse and manage tools available from your Model Context Protocol servers"
        icon={Wrench}
        actions={
            <div className="flex gap-2">
                {/* Could add refresh button here */}
            </div>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Filters using SearchFilterBar */}
      <SearchFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tools by name or description..."
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { value: 'all', label: 'All Categories' },
              ...categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
            ],
            className: 'w-full sm:w-auto min-w-[150px]'
          },
          {
            key: 'server',
            value: serverFilter,
            onChange: setServerFilter,
            options: [
              { value: 'all', label: 'All Servers' },
              ...servers.map(s => ({ value: s.id, label: s.name }))
            ],
            className: 'w-full sm:w-auto min-w-[150px]'
          }
        ]}
      />

      {/* Results Count */}
      <div className="flex justify-between items-center text-sm text-base-content/70">
        <span>Showing {filteredTools.length} of {totalTools} tools</span>
      </div>

      {/* Tool Grid */}
      {filteredTools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No Tools Found"
          description={searchTerm || categoryFilter !== 'all' || serverFilter !== 'all'
            ? "Try adjusting your search criteria or filters."
            : "Connect an MCP server to discover tools."}
          variant={tools.length === 0 ? 'noData' : 'noResults'}
          actionLabel={tools.length === 0 ? "Go to Servers" : "Clear Filters"}
          onAction={tools.length === 0
            ? () => window.location.href = '/admin/mcp/servers' // Or navigate via router
            : () => { setSearchTerm(''); setCategoryFilter('all'); setServerFilter('all'); }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div key={tool.id} className="card bg-base-100 shadow-xl border border-base-200 h-full hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-base-200 rounded-lg">
                        <Wrench className="w-5 h-5 text-base-content/70" />
                    </div>
                    <h2 className="card-title text-lg font-bold truncate max-w-[180px]" title={tool.name}>
                      {tool.name}
                    </h2>
                  </div>
                  <div className={`badge ${tool.enabled ? 'badge-success badge-outline' : 'badge-ghost badge-outline'}`}>
                    {tool.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>

                <p className="text-sm text-base-content/70 mb-4 h-10 line-clamp-2">
                  {tool.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge ${getCategoryColor(tool.category)} badge-sm`}>
                    {tool.category}
                  </div>
                  <div className="badge badge-outline badge-sm flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {tool.serverName}
                  </div>
                </div>

                <div className="text-xs space-y-1 mb-4 mt-auto">
                  <div className="flex justify-between">
                      <span className="font-semibold">Usage:</span>
                      <span>{tool.usageCount} times</span>
                  </div>
                  {tool.lastUsed && (
                    <div className="flex justify-between text-base-content/50">
                        <span>Last used:</span>
                        <span>{new Date(tool.lastUsed).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="card-actions justify-between mt-4 pt-4 border-t border-base-200">
                  <button
                    className={`btn btn-sm ${tool.enabled ? 'btn-ghost text-error hover:bg-error/10' : 'btn-ghost text-success hover:bg-success/10'}`}
                    onClick={() => handleToggleTool(tool.id)}
                  >
                    {tool.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="btn btn-sm btn-primary gap-2"
                    onClick={() => handleOpenRunModal(tool)}
                    disabled={!tool.enabled}
                  >
                    <Play className="w-4 h-4" />
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
            <div className="bg-base-200 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-info mt-0.5" />
                <div>
                    <h4 className="font-semibold text-sm mb-1">Tool Description</h4>
                    <p className="text-base-content/70 text-sm">
                    {selectedTool.description}
                    </p>
                </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Input Schema
                </span>
              </label>
              <div className="mockup-code bg-base-300 text-xs p-0 min-h-0 max-h-40 overflow-y-auto">
                <pre className="p-4">
                  <code>{JSON.stringify(selectedTool.inputSchema, null, 2)}</code>
                </pre>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                    <Play className="w-4 h-4" /> Arguments (JSON)
                </span>
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
                  <span className="label-text-alt text-error font-medium flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> {jsonError}
                  </span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt opacity-70">Enter arguments as a valid JSON object matching the schema above.</span>
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MCPToolsPage;
