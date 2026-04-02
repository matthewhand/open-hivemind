import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  LinkIcon,
  PlusIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { Alert } from './DaisyUI/Alert';
import Badge from './DaisyUI/Badge';
import Button from './DaisyUI/Button';
import { SkeletonList } from './DaisyUI/Skeleton';
import Card from './DaisyUI/Card';
import Modal, { ConfirmModal } from './DaisyUI/Modal';
import DataTable from './DaisyUI/DataTable';
import type { RDVColumn, RowAction } from './DaisyUI/DataTable';
import { apiService } from '../services/api';

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
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({ name: '', serverUrl: '', apiKey: '' });

  const fetchServers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await apiService.get('/api/admin/mcp-servers');

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
      if (data.configurations) {
        data.configurations.forEach((config: unknown) => {
          const configObj = config as { name?: string; serverUrl?: string; apiKey?: string };
          if (!serverList.find((s) => s.name === configObj.name) && configObj.name) {
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
      await apiService.post('/api/admin/mcp-servers/connect', formData);
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
    setConfirmModal({
      isOpen: true,
      title: 'Disconnect Server',
      message: `Disconnect from "${serverName}"?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiService.post('/api/admin/mcp-servers/disconnect', { name: serverName });
          setToastMessage('MCP server disconnected');
          setToastType('success');
          fetchServers();
        } catch (err) {
          setToastMessage(err instanceof Error ? err.message : 'Failed to disconnect');
          setToastType('error');
        }
      },
    });
  };

  const handleViewTools = async (server: MCPServer) => {
    setSelectedServer(server);
    try {
      const data: any = await apiService.get(`/api/admin/mcp-servers/${server.name}/tools`);
      setServerTools(data.tools || []);
      setToolsDialogOpen(true);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to fetch tools');
      setToastType('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[200px] p-4">
        <SkeletonList items={4} />
      </div>
    );
  }

  return (
    <Card title="MCP Server Management" className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <WrenchScrewdriverIcon className="w-7 h-7" />
          <h2 className="text-2xl font-bold">MCP Server Management</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={fetchServers}
            startIcon={<ArrowPathIcon className="w-5 h-5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setFormData({ name: '', serverUrl: '', apiKey: '' });
              setConnectDialogOpen(true);
            }}
            startIcon={<PlusIcon className="w-5 h-5" />}
          >
            Connect Server
          </Button>
        </div>
      </div>

      {error && <Alert status="error" message={error} onClose={() => setError(null)} />}

      <DataTable<MCPServer>
        data={servers}
        columns={[
          {
            key: 'name',
            title: 'Name',
            prominent: true,
            render: (value: string) => (
              <div className="flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-base-content/70" />
                <span className="font-medium">{value}</span>
              </div>
            ),
          },
          {
            key: 'serverUrl',
            title: 'Server URL',
            render: (value: string) => <span className="font-mono text-sm">{value}</span>,
          },
          {
            key: 'connected',
            title: 'Status',
            render: (value: boolean) => (
              <Badge variant={value ? 'success' : 'secondary'}>
                {value ? 'Connected' : 'Disconnected'}
              </Badge>
            ),
          },
        ] as RDVColumn<MCPServer>[]}
        actions={[
          {
            label: 'View Tools',
            icon: <WrenchScrewdriverIcon className="w-4 h-4" />,
            variant: 'ghost',
            onClick: (server) => handleViewTools(server),
            hidden: (server) => !server.connected,
            tooltip: 'View Tools',
          },
          {
            label: 'Disconnect',
            icon: <LinkIcon className="w-4 h-4" />,
            variant: 'error',
            onClick: (server) => handleDisconnectServer(server.name),
            tooltip: 'Disconnect',
          },
        ] as RowAction<MCPServer>[]}
        rowKey={(server) => server.name}
      />

      <Modal
        isOpen={connectDialogOpen}
        onClose={() => setConnectDialogOpen(false)}
        title="Connect to MCP Server"
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="mcp-server-name">
              <span className="label-text">Server Name</span>
            </label>
            <input
              id="mcp-server-name"
              type="text"
              className="input input-bordered"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-control">
            <label className="label" htmlFor="mcp-server-url">
              <span className="label-text">Server URL</span>
            </label>
            <input
              id="mcp-server-url"
              type="text"
              className="input input-bordered"
              value={formData.serverUrl}
              onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
              required
            />
            <label className="label">
              <span className="label-text-alt">The URL of the MCP server</span>
            </label>
          </div>
          <div className="form-control">
            <label className="label" htmlFor="mcp-server-apikey">
              <span className="label-text">API Key (Optional)</span>
            </label>
            <input
              id="mcp-server-apikey"
              type="password"
              className="input input-bordered"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            />
          </div>
          <div className="modal-action">
            <Button onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConnectServer}>
              Connect Server
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={toolsDialogOpen}
        onClose={() => setToolsDialogOpen(false)}
        title={`Tools - ${selectedServer?.name}`}
      >
        <div className="py-4">
          {serverTools.length > 0 ? (
            <ul className="menu bg-base-200 w-full rounded-box">
              {serverTools.map((tool) => (
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
            <p className="text-base-content/70">No tools available for this server.</p>
          )}
        </div>
        <div className="modal-action">
          <Button onClick={() => setToolsDialogOpen(false)}>Close</Button>
        </div>
      </Modal>

      {toastMessage && (
        <div className="toast toast-bottom toast-center z-50" role="status" aria-live="polite">
          <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toastMessage}</span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setToastMessage('')}
              aria-label="Close message"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        confirmVariant="warning"
        confirmText="Disconnect"
        cancelText="Cancel"
      />
    </Card>
  );
};

export default MCPServerManager;
