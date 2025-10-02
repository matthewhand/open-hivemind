import React, { useState, useEffect } from 'react';
import {
  Add as AddIcon,
  LinkOff as LinkOffIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

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
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [serverTools, setServerTools] = useState<MCPTool[]>([]);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });

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

      setToast({ open: true, message: 'MCP server connected successfully', type: 'success' });
      setConnectModalOpen(false);
      setFormData({ name: '', serverUrl: '', apiKey: '' });
      fetchServers();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to connect to MCP server',
        type: 'error'
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

      setToast({ open: true, message: 'MCP server disconnected successfully', type: 'success' });
      fetchServers();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to disconnect from MCP server',
        type: 'error'
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
      setToolsModalOpen(true);
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to fetch tools',
        type: 'error'
      });
    }
  };

  const openConnectModal = () => {
    setFormData({ name: '', serverUrl: '', apiKey: '' });
    setConnectModalOpen(true);
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
        <h2 className="text-3xl font-bold">
          MCP Server Management
        </h2>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={fetchServers}
          >
            <RefreshIcon className="mr-2" />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={openConnectModal}
          >
            <AddIcon className="mr-2" />
            Connect Server
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                    <BuildIcon className="text-base-content/60" />
                    <span className="font-bold">{server.name}</span>
                  </div>
                </td>
                <td>
                  <span className="font-mono text-sm">{server.serverUrl}</span>
                </td>
                <td>
                  <div className={`badge ${server.connected ? 'badge-success' : 'badge-ghost'}`}>
                    {server.connected ? 'Connected' : 'Disconnected'}
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    {server.connected && (
                      <div className="tooltip" data-tip="View Tools">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleViewTools(server)}
                        >
                          <BuildIcon />
                        </button>
                      </div>
                    )}
                    <div className="tooltip" data-tip="Disconnect">
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => handleDisconnectServer(server.name)}
                      >
                        <LinkOffIcon />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Connect Server Modal */}
      <dialog id="connect_server_modal" className={`modal ${connectModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-lg">Connect to MCP Server</h3>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Server Name</span></label>
              <input
                type="text"
                placeholder="Server Name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Server URL</span></label>
              <input
                type="text"
                placeholder="https://mcp-server.example.com"
                className="input input-bordered w-full"
                value={formData.serverUrl}
                onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                required
              />
              <label className="label">
                <span className="label-text-alt">The URL of the MCP server</span>
              </label>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">API Key (Optional)</span></label>
              <input
                type="password"
                placeholder="API Key"
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
            <form method="dialog">
              <button className="btn" onClick={() => setConnectModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary ml-2" onClick={handleConnectServer}>
                Connect Server
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Tools Modal */}
      <dialog id="tools_modal" className={`modal ${toolsModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg">
            Tools - {selectedServer?.name}
          </h3>
          <div className="py-4">
            {serverTools.length > 0 ? (
              <ul className="space-y-2">
                {serverTools.map((tool) => (
                  <li key={tool.name} className="border-b pb-2">
                    <div className="flex items-start gap-2">
                      <BuildIcon className="text-base-content/60 mt-1" />
                      <div>
                        <h4 className="font-bold">{tool.name}</h4>
                        <p className="text-sm text-base-content/70">{tool.description}</p>
                      </div>
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
            <form method="dialog">
              <button className="btn" onClick={() => setToolsModalOpen(false)}>Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Toast for notifications */}
      {toast.open && (
        <div className="toast toast-end">
          <div className={`alert alert-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPServerManager;