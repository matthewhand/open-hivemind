import React, { useState, useEffect } from 'react';
import { Button, Modal, Card, Alert, Badge } from './DaisyUI';
import {
  PlusIcon,
  LinkIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
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

const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
  const [serverTools, setServerTools] = useState<MCPTool[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [formData, setFormData] = useState({ name: '', serverUrl: '', apiKey: '' });

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/mcp-servers', { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error('Failed to fetch MCP servers'); }
      const data = await response.json();

      const serverList: MCPServer[] = [];
      if (data.servers) {
        Object.entries(data.servers).forEach(([name, server]: [string, unknown]) => {
          const serverObj = server as { serverUrl?: string; apiKey?: string };
          serverList.push({ name, serverUrl: serverObj.serverUrl || '', apiKey: serverObj.apiKey || '', connected: true });
        });
      }
      if (data.configurations) {
        data.configurations.forEach((config: unknown) => {
          const configObj = config as { name?: string; serverUrl?: string; apiKey?: string };
          if (!serverList.find(s => s.name === configObj.name) && configObj.name) {
            serverList.push({ name: configObj.name, serverUrl: configObj.serverUrl || '', apiKey: configObj.apiKey || '', connected: false });
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

  useEffect(() => { fetchServers(); }, []);

  const handleConnectServer = async () => {
    try {
      const response = await fetch('/api/admin/mcp-servers/connect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });
      if (!response.ok) { throw new Error('Failed to connect to MCP server'); }
      setToastMessage('MCP server connected successfully');
      setToastType('success');
      setConnectDialogOpen(false);
      setFormData({ name: '', serverUrl: '', apiKey: '' });
      fetchServers();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to connect');
      setToastType('error');
    }
  };

  const handleDisconnectServer = async (serverName: string) => {
    if (!confirm(`Disconnect from "${serverName}"?`)) { return; }
    try {
      const response = await fetch('/api/admin/mcp-servers/disconnect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: serverName }),
      });
      if (!response.ok) { throw new Error('Failed to disconnect'); }
      setToastMessage('MCP server disconnected');
      setToastType('success');
      fetchServers();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to disconnect');
      setToastType('error');
    }
  };

  const handleViewTools = async (server: MCPServer) => {
    setSelectedServer(server);
    try {
      const response = await fetch(`/api/admin/mcp-servers/${server.name}/tools`, { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error('Failed to fetch tools'); }
      const data = await response.json();
      setServerTools(data.tools || []);
      setToolsDialogOpen(true);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to fetch tools');
      setToastType('error');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <Card title="MCP Server Management" className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <WrenchScrewdriverIcon className="w-7 h-7" />
          <h2 className="text-2xl font-bold">MCP Server Management</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchServers} startIcon={<ArrowPathIcon className="w-5 h-5" />}>Refresh</Button>
          <Button variant="primary" onClick={() => { setFormData({ name: '', serverUrl: '', apiKey: '' }); setConnectDialogOpen(true); }} startIcon={<PlusIcon className="w-5 h-5" />}>Connect Server</Button>
        </div>
      </div>

      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr><th>Name</th><th>Server URL</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {servers.map(server => (
              <tr key={server.name} className="hover">
                <td><div className="flex items-center gap-2"><WrenchScrewdriverIcon className="w-5 h-5 text-base-content/70" /><span className="font-medium">{server.name}</span></div></td>
                <td><span className="font-mono text-sm">{server.serverUrl}</span></td>
                <td><Badge variant={server.connected ? 'success' : 'secondary'}>{server.connected ? 'Connected' : 'Disconnected'}</Badge></td>
                <td>
                  <div className="flex gap-2">
                    {server.connected && <Button size="sm" variant="ghost" onClick={() => handleViewTools(server)}><WrenchScrewdriverIcon className="w-4 h-4" /></Button>}
                    <Button size="sm" variant="ghost" className="text-error" onClick={() => handleDisconnectServer(server.name)}><LinkIcon className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={connectDialogOpen} onClose={() => setConnectDialogOpen(false)} title="Connect to MCP Server">
        <div className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Server Name</span></label>
            <input type="text" className="input input-bordered" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Server URL</span></label>
            <input type="text" className="input input-bordered" value={formData.serverUrl} onChange={e => setFormData({ ...formData, serverUrl: e.target.value })} required />
            <label className="label"><span className="label-text-alt">The URL of the MCP server</span></label>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">API Key (Optional)</span></label>
            <input type="password" className="input input-bordered" value={formData.apiKey} onChange={e => setFormData({ ...formData, apiKey: e.target.value })} />
          </div>
          <div className="modal-action">
            <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConnectServer}>Connect Server</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={toolsDialogOpen} onClose={() => setToolsDialogOpen(false)} title={`Tools - ${selectedServer?.name}`}>
        <div className="py-4">
          {serverTools.length > 0 ? (
            <ul className="menu bg-base-200 w-full rounded-box">
              {serverTools.map(tool => (
                <li key={tool.name}>
                  <div className="flex flex-col items-start gap-1 p-4">
                    <div className="flex items-center gap-2 font-bold"><WrenchScrewdriverIcon className="w-4 h-4" />{tool.name}</div>
                    <p className="text-sm opacity-70">{tool.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base-content/70">No tools available for this server.</p>
          )}
        </div>
        <div className="modal-action"><Button onClick={() => setToolsDialogOpen(false)}>Close</Button></div>
      </Modal>

      {toastMessage && (
        <div className="toast toast-bottom toast-center z-50">
          <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toastMessage}</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setToastMessage('')}>✕</button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MCPServerManager;