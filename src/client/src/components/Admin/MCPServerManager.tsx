import React, { useState, useEffect } from 'react';
import {
  ModalForm,
  Button,
  Card,
  Badge,
  Alert,
  Loading,
  ToastNotification,
  DataTable
} from '../DaisyUI';
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon,
  LinkIcon,
  CodeBracketIcon,
  PlayIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface MCPServer {
  name: string;
  url: string;
  apiKey?: string;
  connected: boolean;
  tools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
  lastConnected?: string;
  error?: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverName: string;
}

const MCPServerManager: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openToolDialog, setOpenToolDialog] = useState(false);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolTestArgs, setToolTestArgs] = useState<string>('{}');
  const [currentTab, setCurrentTab] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/mcp/servers');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      setError('Failed to fetch MCP servers');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleFormSubmit = async (data: Record<string, string | number | boolean>) => {
    const serverData = {
      name: data.name as string,
      serverUrl: data.serverUrl as string,
      apiKey: data.apiKey as string || ''
    };

    try {
      const response = await fetch('/api/admin/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData)
      });

      if (!response.ok) throw new Error('Failed to add server');

      setToast({ show: true, message: 'MCP server added successfully', type: 'success' });
      setOpenDialog(false);
      fetchServers();
    } catch {
      setToast({ show: true, message: 'Error adding MCP server', type: 'error' });
    }
  };

  const handleConnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}/connect`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to connect to server');

      setToast({ show: true, message: 'MCP server connected successfully', type: 'success' });
      fetchServers();
    } catch (error) {
      setToast({ show: true, message: 'Error connecting to MCP server', type: 'error' });
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}/disconnect`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to disconnect from server');

      setToast({ show: true, message: 'MCP server disconnected successfully', type: 'success' });
      fetchServers();
    } catch (error) {
      setToast({ show: true, message: 'Error disconnecting from MCP server', type: 'error' });
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    if (!confirm(`Are you sure you want to delete the MCP server "${serverName}"?`)) return;

    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete server');

      setToast({ show: true, message: 'MCP server deleted successfully', type: 'success' });
      fetchServers();
    } catch (error) {
      setToast({ show: true, message: 'Error deleting MCP server', type: 'error' });
    }
  };

  const handleTestTool = async () => {
    if (!selectedTool) return;

    try {
      const args = JSON.parse(toolTestArgs);
      const response = await fetch(`/api/admin/mcp/servers/${selectedTool.serverName}/call-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: selectedTool.name,
          arguments: args
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Tool execution failed');

      setToast({
        show: true,
        message: `Tool executed successfully: ${JSON.stringify(result.result).substring(0, 100)}...`,
        type: 'success'
      });
      setOpenToolDialog(false);
    } catch (error) {
      setToast({ show: true, message: `Tool execution failed: ${error}`, type: 'error' });
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverName]: !prev[serverName]
    }));
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  const getAllTools = () => {
    const tools: MCPTool[] = [];
    servers.forEach(server => {
      if (server.tools) {
        server.tools.forEach(tool => {
          tools.push({
            ...tool,
            serverName: server.name
          });
        });
      }
    });
    return tools;
  };

  const tabs = [
    { label: `Servers (${servers.length})`, icon: Cog6ToothIcon },
    { label: `Tools (${getAllTools().length})`, icon: WrenchScrewdriverIcon },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">MCP Server Manager</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            startIcon={<ArrowPathIcon className="w-5 h-5" />}
            onClick={fetchServers}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            startIcon={<PlusIcon className="w-5 h-5" />}
            onClick={() => setOpenDialog(true)}
          >
            Add Server
          </Button>
        </div>
      </div>

      <div role="tablist" className="tabs tabs-boxed mb-6">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          return (
            <a
              key={index}
              role="tab"
              className={`tab gap-2 ${currentTab === index ? 'tab-active' : ''}`}
              onClick={() => setCurrentTab(index)}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </a>
          );
        })}
      </div>

      {currentTab === 0 && (
        <div>
          {servers.length === 0 ? (
            <Alert type="info">No MCP servers configured</Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servers.map((server) => (
                <div key={server.name} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="card-title">{server.name}</h3>
                      <Badge color={server.connected ? 'success' : 'error'}>
                        {server.connected ? (
                          <><CheckCircleIcon className="w-4 h-4 mr-1" /> Connected</>
                        ) : (
                          <><XCircleIcon className="w-4 h-4 mr-1" /> Disconnected</>
                        )}
                      </Badge>
                    </div>

                    <p className="text-sm text-base-content/70 mb-4">{server.url}</p>

                    {server.error && (
                      <Alert type="error" className="mb-4">
                        {server.error}
                      </Alert>
                    )}

                    {server.tools && server.tools.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-base-content/70 mb-2">
                          Tools Available: {server.tools.length}
                        </p>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => toggleServerExpanded(server.name)}
                        >
                          {expandedServers[server.name] ? 'Hide' : 'Show'} Tools
                          <ChevronDownIcon className={`w-4 h-4 ml-1 transition-transform ${expandedServers[server.name] ? 'rotate-180' : ''}`} />
                        </button>

                        {expandedServers[server.name] && (
                          <div className="mt-4 space-y-2">
                            {server.tools.map((tool, index) => (
                              <div key={index} className="card bg-base-200">
                                <div className="card-body p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium text-sm">{tool.name}</h4>
                                      <p className="text-xs text-base-content/70">{tool.description}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setSelectedTool({ ...tool, serverName: server.name });
                                        setOpenToolDialog(true);
                                      }}
                                    >
                                      <PlayIcon className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {server.lastConnected && (
                      <p className="text-xs text-base-content/60 mb-4">
                        Last connected: {new Date(server.lastConnected).toLocaleString()}
                      </p>
                    )}

                    <div className="card-actions justify-end gap-2">
                      {server.connected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          color="error"
                          onClick={() => handleDisconnect(server.name)}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleConnect(server.name)}
                        >
                          Connect
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        color="error"
                        onClick={() => handleDeleteServer(server.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentTab === 1 && (
        <div>
          {getAllTools().length === 0 ? (
            <Alert type="info">No tools available from connected MCP servers</Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Tool Name</th>
                    <th>Description</th>
                    <th>Server</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getAllTools().map((tool, index) => (
                    <tr key={`${tool.serverName}-${tool.name}`}>
                      <td>
                        <div className="flex items-center gap-2">
                          <WrenchScrewdriverIcon className="w-4 h-4" />
                          <span className="font-medium">{tool.name}</span>
                        </div>
                      </td>
                      <td className="text-sm text-base-content/70">{tool.description}</td>
                      <td>
                        <Badge color="primary">{tool.serverName}</Badge>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTool(tool);
                            setOpenToolDialog(true);
                          }}
                        >
                          <PlayIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Server Dialog */}
      <ModalForm
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Add MCP Server"
        onSubmit={handleFormSubmit}
        submitLabel="Add Server"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Server Name</span>
            </label>
            <input
              type="text"
              name="name"
              className="input input-bordered w-full"
              placeholder="Enter server name"
              required
            />
            <label className="label">
              <span className="label-text-alt">Unique identifier for this MCP server</span>
            </label>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Server URL</span>
            </label>
            <input
              type="text"
              name="serverUrl"
              className="input input-bordered w-full"
              placeholder="e.g., stdio://path/to/server or http://localhost:3000"
              required
            />
            <label className="label">
              <span className="label-text-alt">MCP server connection URL</span>
            </label>
          </div>

          <div>
            <label className="label">
              <span className="label-text">API Key (optional)</span>
            </label>
            <input
              type="text"
              name="apiKey"
              className="input input-bordered w-full"
              placeholder="Enter API key if required"
            />
            <label className="label">
              <span className="label-text-alt">Authentication key if required by the server</span>
            </label>
          </div>
        </div>
      </ModalForm>

      {/* Tool Test Dialog */}
      {selectedTool && (
        <ModalForm
          open={openToolDialog}
          onClose={() => setOpenToolDialog(false)}
          title={`Test Tool: ${selectedTool.name}`}
          onSubmit={handleTestTool}
          submitLabel="Execute Tool"
        >
          <div className="space-y-4">
            <p className="text-sm text-base-content/70">{selectedTool.description}</p>

            <div>
              <label className="label">
                <span className="label-text">Input Schema:</span>
              </label>
              <div className="mockup-code">
                <pre className="text-xs">
                  {JSON.stringify(selectedTool.inputSchema, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Tool Arguments (JSON)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={4}
                value={toolTestArgs}
                onChange={(e) => setToolTestArgs(e.target.value)}
                placeholder="{}"
              />
              <label className="label">
                <span className="label-text-alt">Enter arguments as JSON object</span>
              </label>
            </div>
          </div>
        </ModalForm>
      )}

      {/* Toast Notifications */}
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
};

export default MCPServerManager;