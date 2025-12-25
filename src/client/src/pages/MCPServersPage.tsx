import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs, Alert, Modal } from '../components/DaisyUI';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  description: string;
  toolCount: number;
  lastConnected?: string;
}

const MCPServersPage: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const breadcrumbItems = [
    { label: 'MCP', href: '/uber/mcp' },
    { label: 'Servers', href: '/uber/mcp/servers', isActive: true },
  ];

  // Mock servers - in real app this would come from API
  const mockServers: MCPServer[] = [
    {
      id: '1',
      name: 'GitHub Integration',
      url: 'mcp://github-server:8080',
      status: 'running',
      description: 'GitHub repository management and issue tracking',
      toolCount: 12,
      lastConnected: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      name: 'Database Tools',
      url: 'mcp://db-server:3306',
      status: 'running',
      description: 'Database query and management tools',
      toolCount: 8,
      lastConnected: '2024-01-15T09:15:00Z',
    },
    {
      id: '3',
      name: 'File System',
      url: 'mcp://fs-server:9000',
      status: 'stopped',
      description: 'File system operations and management',
      toolCount: 15,
      lastConnected: '2024-01-14T16:45:00Z',
    },
    {
      id: '4',
      name: 'API Gateway',
      url: 'mcp://api-gateway:8443',
      status: 'error',
      description: 'External API integrations and webhooks',
      toolCount: 6,
      lastConnected: '2024-01-13T14:20:00Z',
    },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setServers(mockServers);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'running': return 'badge-success';
    case 'stopped': return 'badge-ghost';
    case 'error': return 'badge-error';
    default: return 'badge-ghost';
    }
  };

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      // Simulate API call
      setAlert({ type: 'success', message: `Server ${action} action completed` });

      // Update server status
      setServers(prev => prev.map(server =>
        server.id === serverId
          ? { ...server, status: action === 'start' ? 'running' : 'stopped' }
          : server,
      ));
    } catch (error) {
      setAlert({ type: 'error', message: `Failed to ${action} server` });
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
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditServer = (server: MCPServer) => {
    setSelectedServer(server);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleSaveServer = async () => {
    if (!selectedServer) {return;}

    try {
      if (isEditing) {
        // Update existing server
        setServers(prev => prev.map(server =>
          server.id === selectedServer.id ? selectedServer : server,
        ));
        setAlert({ type: 'success', message: 'Server updated successfully' });
      } else {
        // Add new server
        const newServer = { ...selectedServer, id: Date.now().toString() };
        setServers(prev => [...prev, newServer]);
        setAlert({ type: 'success', message: 'Server added successfully' });
      }
      setDialogOpen(false);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save server' });
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      try {
        setServers(prev => prev.filter(server => server.id !== serverId));
        setAlert({ type: 'success', message: 'Server deleted successfully' });
      } catch (error) {
        setAlert({ type: 'error', message: 'Failed to delete server' });
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

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.map((server) => (
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

      {/* Add/Edit Server Modal */}
      <Modal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={isEditing ? 'Edit MCP Server' : 'Add MCP Server'}
      >
        <div className="space-y-4">
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