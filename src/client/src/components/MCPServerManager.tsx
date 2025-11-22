import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  LinkIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface MCPServer {
  name: string;
  serverUrl: string;
  apiKey?: string;
  connected: boolean;
  tools?: unknown[];
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: unknown;
}

const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
  const [serverTools, setServerTools] = useState<MCPTool[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    serverUrl: '',
    apiKey: '',
  });

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the admin API endpoint for MCP servers
      const response = await fetch('/api/admin/mcp-servers');
      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }
      const data = await response.json();

      const serverList: MCPServer[] = [];
      if (data.servers) {
        Object.entries(data.servers).forEach(([name, server]: [string, unknown]) => {
          const serverObj = server as { serverUrl?: string; apiKey?: string };
          serverList.push({
            name,
            serverUrl: serverObj.serverUrl || '',
            apiKey: serverObj.apiKey || '',
            connected: true,
          });
        });
      }

      // Add configured servers that might not be connected
      if (data.configurations) {
        data.configurations.forEach((config: unknown) => {
          const configObj = config as { name?: string; serverUrl?: string; apiKey?: string };
          const existing = serverList.find(s => s.name === configObj.name);
          if (!existing && configObj.name) {
            serverList.push({
              name: configObj.name,
              serverUrl: configObj.serverUrl || '',
              apiKey: configObj.apiKey || '',
              connected: false,
            });
          }
        });
      }

      setServers(serverList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleConnectServer = async () => {
    try {
      const response = await fetch('/api/admin/mcp-servers/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to MCP server');
      }

      setSnackbar({ open: true, message: 'MCP server connected successfully', severity: 'success' });
      setConnectDialogOpen(false);
      setFormData({ name: '', serverUrl: '', apiKey: '' });
      fetchServers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to connect to MCP server',
        severity: 'error'
      });
    }
  };

  const handleDisconnectServer = async (serverName: string) => {
    if (!confirm(`Are you sure you want to disconnect from MCP server "${serverName}"?`)) return;

    try {
      const response = await fetch('/api/admin/mcp-servers/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: serverName }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect from MCP server');
      }

      setSnackbar({ open: true, message: 'MCP server disconnected successfully', severity: 'success' });
      fetchServers();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to disconnect from MCP server',
        severity: 'error'
      });
    }
  };

  const handleViewTools = async (server: MCPServer) => {
    setSelectedServer(server);
    try {
      const response = await fetch(`/api/admin/mcp-servers/${server.name}/tools`);
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }
      const data = await response.json();
      setServerTools(data.tools || []);
      setToolsDialogOpen(true);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to fetch tools',
        severity: 'error'
      });
    }
  };

  const openConnectDialog = () => {
    setFormData({ name: '', serverUrl: '', apiKey: '' });
    setConnectDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          MCP Server Management
        </h2>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={fetchServers}
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={openConnectDialog}
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Connect Server
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Server URL</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <tr key={server.name} className="hover">
                <td>
                  <div className="flex items-center gap-2">
                    <WrenchScrewdriverIcon className="w-5 h-5 text-base-content/70" />
                    <span className="font-medium">{server.name}</span>
                  </div>
                </td>
                <td>
                  <span className="font-mono text-sm">{server.serverUrl}</span>
                </td>
                <td>
                  <div className={`badge ${server.connected ? 'badge-success' : 'badge-ghost'} badge-sm`}>
                    {server.connected ? 'Connected' : 'Disconnected'}
                  </div>
                </td>
                <td>
                  <div className="flex gap-2">
                    {server.connected && (
                      <div className="tooltip" data-tip="View Tools">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleViewTools(server)}
                        >
                          <WrenchScrewdriverIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="tooltip" data-tip="Disconnect">
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDisconnectServer(server.name)}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Connect Server Dialog */}
      {connectDialogOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Connect to MCP Server</h3>
            <div className="py-4 space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Server Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Server URL</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.serverUrl}
                  onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                  required
                />
                <label className="label">
                  <span className="label-text-alt">The URL of the MCP server</span>
                </label>
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">API Key (Optional)</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
                <label className="label">
                  <span className="label-text-alt">API key for server authentication (if required)</span>
                </label>
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setConnectDialogOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConnectServer}>Connect Server</button>
            </div>
          </div>
        </div>
      )}

      {/* Tools Dialog */}
      {toolsDialogOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-3xl">
            <h3 className="font-bold text-lg">
              Tools - {selectedServer?.name}
            </h3>
            <div className="py-4">
              {serverTools.length > 0 ? (
                <ul className="menu bg-base-200 w-full rounded-box">
                  {serverTools.map((tool, index) => (
                    <li key={tool.name}>
                      <div className="flex flex-col items-start gap-1 p-4">
                        <div className="flex items-center gap-2 font-bold">
                          <WrenchScrewdriverIcon className="w-4 h-4" />
                          {tool.name}
                        </div>
                        <p className="text-sm opacity-70">{tool.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base-content/70">
                  No tools available for this server.
                </p>
              )}
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setToolsDialogOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <div className="toast toast-bottom toast-center z-50">
          <div className={`alert ${snackbar.severity === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{snackbar.message}</span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setSnackbar({ ...snackbar, open: false })}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPServerManager;