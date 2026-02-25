/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Play,
  Search,
  Check,
  X,
  Server,
  Filter
} from 'lucide-react';
import { Breadcrumbs, Alert, Modal, PageHeader, EmptyState } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
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
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'MCP', href: '/admin/mcp/servers' },
    { label: 'Tools', href: '/admin/mcp/tools', isActive: true },
  ];

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const json = await apiService.getMCPServers();
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
      const json = await apiService.executeMCPTool(selectedTool.serverName, selectedTool.name, args);
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
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-base-content/70">Loading MCP tools...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="MCP Tools"
        description="Browse and manage tools available from your connected MCP servers"
        icon={Wrench}
        actions={
          <div className="text-sm text-base-content/70 flex items-center gap-2">
            <span className="badge badge-neutral">{tools.length} Tools Available</span>
          </div>
        }
      />

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {/* Filters using SearchFilterBar */}
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
              ...categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
            ],
            className: 'w-full md:w-48'
          },
          {
            key: 'server',
            value: serverFilter,
            onChange: setServerFilter,
            options: [
              { value: 'all', label: 'All Servers' },
              ...servers.map(s => ({ value: s.id, label: s.name }))
            ],
            className: 'w-full md:w-48'
          }
        ]}
      />

      {filteredTools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={tools.length === 0 ? "No Tools Found" : "No Matches Found"}
          description={tools.length === 0 ? "Connect an MCP server to discover tools." : "Try adjusting your search or filters."}
          actionLabel={tools.length === 0 ? "Manage Servers" : "Clear Filters"}
          actionIcon={tools.length === 0 ? Server : Filter}
          onAction={tools.length === 0 ? () => window.location.href = '/admin/mcp/servers' : () => { setSearchTerm(''); setCategoryFilter('all'); setServerFilter('all'); }}
          variant={tools.length === 0 ? 'noData' : 'noResults'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredTools.map((tool) => (
            <div key={tool.id} className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <div className="card-body p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <div className="p-2 bg-base-200 rounded-lg">
                      <Wrench className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="card-title text-lg leading-tight break-words">
                        {tool.name}
                      </h2>
                      <span className="text-xs text-base-content/50">{tool.serverName}</span>
                    </div>
                  </div>
                  <div className={`badge ${tool.enabled ? 'badge-success badge-outline' : 'badge-ghost badge-outline'} text-xs font-medium`}>
                    {tool.enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>

                <p className="text-sm text-base-content/70 mb-4 line-clamp-3 flex-grow">
                  {tool.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className={`badge ${getCategoryColor(tool.category)} badge-sm`}>
                    {tool.category}
                  </div>
                  {tool.usageCount > 0 && (
                    <div className="badge badge-ghost badge-sm gap-1">
                      <Play className="w-3 h-3" /> {tool.usageCount}
                    </div>
                  )}
                </div>

                <div className="card-actions justify-between mt-auto pt-4 border-t border-base-200">
                  <button
                    className={`btn btn-sm btn-ghost ${tool.enabled ? 'text-error hover:bg-error/10' : 'text-success hover:bg-success/10'}`}
                    onClick={() => handleToggleTool(tool.id)}
                  >
                    {tool.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleOpenRunModal(tool)}
                    disabled={!tool.enabled}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run
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
            <div className="alert alert-info bg-base-200 border-none text-sm py-2">
              <span className="opacity-80">{selectedTool.description}</span>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Input Schema
                </span>
              </label>
              <div className="mockup-code bg-base-300 text-xs p-0 min-h-0 max-h-48 overflow-y-auto rounded-lg">
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
