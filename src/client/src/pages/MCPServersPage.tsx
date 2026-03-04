/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Server, Search } from 'lucide-react';
import { Breadcrumbs, Alert, Modal, EmptyState } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  toolCount: number;
  lastConnected?: string;
  apiKey?: string;
  error?: string;
  tools?: Tool[];
}

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const stored = localStorage.getItem('auth_tokens');
    if (stored) {
      const parsed = JSON.parse(stored) as { accessToken?: string };
      if (parsed.accessToken) headers['Authorization'] = `Bearer ${parsed.accessToken}`;
    }
  } catch { /* ignore */ }
  return headers;
};

const MCPServersPage: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [viewingTools, setViewingTools] = useState<Tool[]>([]);
  const [viewingServerName, setViewingServerName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const breadcrumbItems = [
    { label: 'MCP', href: '/admin/mcp' },
    { label: 'Servers', href: '/admin/mcp/servers', isActive: true },
  ];

  // Fetch real MCP servers from API
  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/mcp-servers', { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error(`Failed to fetch MCP servers: ${response.statusText}`);
      }
      const data = await response.json();

      // Map API response to MCPServer format
      const connectedServers: MCPServer[] = (data.data?.servers || []).map((server: any, index: number) => ({
        id: server.name || `server-${index}`,
        name: server.name || 'Unknown',
        url: server.serverUrl || server.url || '',
        status: server.connected ? 'running' : 'stopped',
        description: server.description || '',
        toolCount: server.tools?.length || 0,
        lastConnected: server.lastConnected,
        tools: server.tools || [],
      }));

      // Also include stored configurations that might not be connected
      const storedConfigs: MCPServer[] = (data.data?.configurations || []).map((config: any, index: number) => {
        // Check if this config is already in connectedServers
        const existing = connectedServers.find(s => s.name === config.name);
        if (existing) return null;
        return {
          id: config.name || `config-${index}`,
          name: config.name || 'Unknown',
          url: config.serverUrl || '',
          status: 'stopped' as const,
          description: '',
          toolCount: 0,
        };
      }).filter(Boolean);

      setServers([...connectedServers, ...storedConfigs]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Filter servers based on search and status
  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.url.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' || server.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'badge-success';
      case 'stopped': return 'badge-ghost';
      case 'error': return 'badge-error';
      default: return 'badge-ghost';
    }
  };

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    if (action === 'restart') {
      await handleServerAction(serverId, 'stop');
      await handleServerAction(serverId, 'start');
      return;
    }

    try {
      let response;
      if (action === 'stop') {
        response = await fetch('/api/admin/mcp-servers/disconnect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: serverId }),
        });
      } else {
        const server = servers.find(s => s.id === serverId);
        if (!server) {throw new Error('Server not found');}

        response = await fetch('/api/admin/mcp-servers/connect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: server.name,
            serverUrl: server.url,
          }),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to ${action} server`);
      }

      setAlert({ type: 'success', message: `Server ${action} action completed` });

      // Clear error state if action succeeded
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: action === 'start' ? 'running' : 'stopped', error: undefined } : s));

      await fetchServers();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : `Failed to ${action} server`;
      setAlert({ type: 'error', message: errorMsg });

      // Set error state on the server card
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: 'error', error: errorMsg } : s));
    }
  };

  const handleViewTools = async (server: MCPServer) => {
    // If we already have tools loaded (e.g. from initial fetch), use them
    if (server.tools && server.tools.length > 0) {
      setViewingTools(server.tools);
      setViewingServerName(server.name);
      setToolsModalOpen(true);
      return;
    }

    // Otherwise try to fetch them via test endpoint
    try {
      const response = await fetch('/api/admin/mcp-servers/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: server.name,
          serverUrl: server.url,
          apiKey: server.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }

      const data = await response.json();
      const tools = data.data?.tools || [];

      setViewingTools(tools);
      setViewingServerName(server.name);
      setToolsModalOpen(true);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to retrieve tools for this server.' });
    }
  };

  const handleAddServer = () => {
    setSelectedServer({
      id: '',
      name: '',
      url: '',
      status: 'stopped',
      description: '',
      toolCount: 0,
      apiKey: '',
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditServer = (server: MCPServer) => {
    setSelectedServer(server);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleTestConnection = async () => {
    if (!selectedServer?.url) {
      setAlert({ type: 'error', message: 'Server URL is required' });
      return;
    }

    try {
      setIsTesting(true);
      const response = await fetch('/api/admin/mcp-servers/test', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: selectedServer.name || 'Test Server',
          serverUrl: selectedServer.url,
          apiKey: selectedServer.apiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Connection failed');
      }

      const data = await response.json();
      const toolCount = data.data?.toolCount || 0;
      const tools = data.data?.tools || [];

      const toolNames = tools.slice(0, 5).map((t: any) => t.name).join(', ');
      const moreText = tools.length > 5 ? ` and ${tools.length - 5} more` : '';

      const message = `Connection successful! Found ${toolCount} tools: ${toolNames}${moreText}`;

      setAlert({ type: 'success', message });
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveServer = async () => {
    if (!selectedServer) { return; }

    // Validate required fields
    if (!selectedServer.name?.trim()) {
      setAlert({ type: 'error', message: 'Server name is required' });
      return;
    }
    if (!selectedServer.url?.trim()) {
      setAlert({ type: 'error', message: 'Server URL is required' });
      return;
    }

    try {
      if (isEditing) {
        // For editing, we disconnect and reconnect
        await fetch('/api/admin/mcp-servers/disconnect', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ name: selectedServer.id }),
        });
      }

      // Connect to server
      const response = await fetch('/api/admin/mcp-servers/connect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: selectedServer.name,
          serverUrl: selectedServer.url,
          apiKey: selectedServer.apiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to connect to server');
      }

      setAlert({ type: 'success', message: isEditing ? 'Server updated successfully' : 'Server added successfully' });
      setDialogOpen(false);
      await fetchServers();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save server' });
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (window.confirm('Are you sure you want to delete this server configuration? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/admin/mcp-servers/${encodeURIComponent(serverId)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to delete server');
        }

        setAlert({ type: 'success', message: 'Server deleted successfully' });
        await fetchServers();
      } catch (err) {
        setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete server' });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading MCP servers...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (servers.length === 0) {
      return (
        <EmptyState
          icon={Server}
          title="No servers configured"
          description="Connect an MCP server to get started extending your bot's capabilities."
          actionLabel="Add Server"
          onAction={handleAddServer}
          variant="noData"
        />
      );
    }

    if (filteredServers.length === 0) {
      return (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`No servers match your search for "${searchTerm}".`}
          actionLabel="Clear Search"
          onAction={() => {
            setSearchTerm('');
            setStatusFilter('All');
          }}
          variant="noResults"
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => (
          <div key={server.id} className="card bg-base-100 shadow-xl h-full border border-base-200">
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <h2 className="card-title text-lg font-bold">
                  {server.name}
                </h2>
                <div className={`badge ${getStatusColor(server.status)}`}>
                  {server.status}
                </div>
              </div>

              <p className="text-sm text-base-content/70 mb-2 min-h-[40px]">
                {server.description || 'No description provided.'}
              </p>

              {server.status === 'error' && server.error && (
                <div className="alert alert-error text-xs py-2 px-3 mb-3">
                  <ExclamationCircleIcon className="w-4 h-4" />
                  <span>{server.error}</span>
                </div>
              )}

              <div className="text-sm space-y-1 mb-4 bg-base-200/50 p-3 rounded-lg">
                <p className="truncate" title={server.url}><strong>URL:</strong> {server.url}</p>
                <div className="flex items-center gap-2">
                    <p><strong>Tools:</strong> {server.toolCount}</p>
                    {server.toolCount > 0 && (server.status === 'running' || server.tools?.length) && (
                        <button
                            className="btn btn-xs btn-ghost text-primary"
                            onClick={() => handleViewTools(server)}
                        >
                            View Tools
                        </button>
                    )}
                </div>
                {server.lastConnected && (
                  <p className="text-base-content/50 text-xs">
                    Last connected: {new Date(server.lastConnected).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="card-actions justify-between mt-auto pt-4 border-t border-base-200">
                <div className="flex gap-1">
                  {server.status === 'running' ? (
                    <button
                      className="btn btn-ghost btn-sm btn-circle text-error tooltip"
                      data-tip="Disconnect"
                      aria-label={`Disconnect ${server.name}`}
                      onClick={() => handleServerAction(server.id, 'stop')}
                    >
                      <StopIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm btn-circle text-success tooltip"
                      data-tip={server.status === 'stopped' ? "Connect" : "Retry Connection"}
                      aria-label={server.status === 'stopped' ? `Connect ${server.name}` : `Retry Connection ${server.name}`}
                      onClick={() => handleServerAction(server.id, 'start')}
                    >
                        {server.status === 'error' ? <ArrowPathIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                  )}
                  {server.toolCount > 0 && (
                     <button
                        className="btn btn-ghost btn-sm btn-circle tooltip"
                        data-tip="View Tools"
                        aria-label={`View Tools for ${server.name}`}
                        onClick={() => handleViewTools(server)}
                     >
                        <WrenchScrewdriverIcon className="w-5 h-5" />
                     </button>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn btn-ghost btn-sm btn-circle tooltip"
                    data-tip="Edit Configuration"
                    aria-label={`Edit ${server.name}`}
                    onClick={() => handleEditServer(server)}
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-circle text-error tooltip"
                    data-tip="Delete"
                    aria-label={`Delete ${server.name}`}
                    onClick={() => handleDeleteServer(server.id)}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex justify-between items-center mt-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            MCP Servers
          </h1>
          <p className="text-base-content/70">
            Manage Model Context Protocol servers and their tools
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAddServer}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Server
        </button>
      </div>

      {servers.length > 0 && (
        <div className="mb-6">
          <SearchFilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search servers..."
            filters={[
              {
                key: 'status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: 'All', label: 'All Status' },
                  { value: 'running', label: 'Running' },
                  { value: 'stopped', label: 'Stopped' },
                  { value: 'error', label: 'Error' },
                ],
              },
            ]}
          />
        </div>
      )}

      {alert && !dialogOpen && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {renderContent()}

      {/* Tools Modal */}
      <Modal
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        title={`Tools provided by ${viewingServerName}`}
      >
        <div className="overflow-y-auto max-h-[60vh]">
            {viewingTools.length === 0 ? (
                <div className="text-center py-8 opacity-50">No tools found for this server.</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {viewingTools.map((tool, idx) => (
                        <div key={idx} className="border border-base-200 rounded-lg p-4 bg-base-100">
                            <div className="flex items-center gap-2 mb-2">
                                <WrenchScrewdriverIcon className="w-4 h-4 text-primary" />
                                <h3 className="font-bold text-lg">{tool.name}</h3>
                            </div>
                            <p className="text-sm text-base-content/80 mb-2">{tool.description || 'No description provided.'}</p>
                            {tool.inputSchema && (
                                <div className="collapse collapse-arrow bg-base-200">
                                    <input type="checkbox" />
                                    <div className="collapse-title text-xs font-medium uppercase opacity-50">
                                        Input Schema
                                    </div>
                                    <div className="collapse-content">
                                        <pre className="text-xs bg-base-300 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(tool.inputSchema, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
        <div className="modal-action">
            <button className="btn" onClick={() => setToolsModalOpen(false)}>Close</button>
        </div>
      </Modal>

      {/* Add/Edit Server Modal */}
      <Modal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
      >
        <div className="space-y-4">
          {alert && (
            <div className={`alert ${alert.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white mb-4 flex flex-row items-center gap-2 border-none`}>
              {alert.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <ExclamationCircleIcon className="w-6 h-6" />}
              <span>{alert.message}</span>
            </div>
          )}

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Server Name *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={selectedServer?.name || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, name: e.target.value } : null)}
              required
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Server URL *</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={selectedServer?.url || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, url: e.target.value } : null)}
              required
              placeholder="mcp://server-host:port"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">API Key (Optional)</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={selectedServer?.apiKey || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
              placeholder="Leave blank if not required or unchanged"
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={selectedServer?.description || ''}
              onChange={(e) => setSelectedServer(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
          </div>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-ghost mr-auto"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? <span className="loading loading-spinner loading-xs"></span> : null}
            Test Connection
          </button>
          <button className="btn btn-ghost" onClick={() => setDialogOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSaveServer}>
            {isEditing ? 'Update' : 'Add'} Server
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MCPServersPage;