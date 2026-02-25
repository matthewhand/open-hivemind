/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Server as ServerIcon } from 'lucide-react';
import { Breadcrumbs, Alert, Modal, EmptyState } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  toolCount: number;
  lastConnected?: string;
  apiKey?: string;
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
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredServers = servers.filter((server) => {
    const matchesSearch =
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
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
      await fetchServers();
    } catch (error) {
      setAlert({ type: 'error', message: error instanceof Error ? error.message : `Failed to ${action} server` });
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

      {alert && !dialogOpen && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search servers..."
        className="mb-6"
        filters={[
          {
            key: 'status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: 'all' },
              { label: 'Running', value: 'running' },
              { label: 'Stopped', value: 'stopped' },
              { label: 'Error', value: 'error' },
            ],
          },
        ]}
      />

      {filteredServers.length === 0 && servers.length > 0 ? (
        <EmptyState
          icon={ServerIcon}
          title="No servers found"
          description={`No servers match your search "${searchQuery}"${statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.`}
          variant="noResults"
          actionLabel="Clear filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => (
            <div key={server.id} className="card bg-base-100 shadow-xl h-full">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                <h2 className="card-title">
                  {server.name}
                </h2>
                <div className={`badge ${getStatusColor(server.status)}`}>
                  {server.status}
                </div>
              </div>

              <p className="text-sm text-base-content/70 mb-4">
                {server.description}
              </p>

              <div className="text-sm space-y-2 mb-4">
                <p><strong>URL:</strong> {server.url}</p>
                <p><strong>Tools:</strong> {server.toolCount}</p>
                {server.lastConnected && (
                  <p className="text-base-content/50">
                    Last connected: {new Date(server.lastConnected).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="card-actions justify-between mt-auto pt-4 border-t border-base-200">
                <div className="flex gap-1">
                  {server.status === 'running' ? (
                    <button
                      className="btn btn-ghost btn-sm btn-circle text-error"
                      onClick={() => handleServerAction(server.id, 'stop')}
                      title="Stop Server"
                    >
                      <StopIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm btn-circle text-success"
                      onClick={() => handleServerAction(server.id, 'start')}
                      title="Start Server"
                    >
                      <PlayIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    className="btn btn-ghost btn-sm btn-circle"
                    onClick={() => handleEditServer(server)}
                    title="Edit Server"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-circle text-error"
                    onClick={() => handleDeleteServer(server.id)}
                    title="Delete Server"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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