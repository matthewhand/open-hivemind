import React, { useState, useEffect } from 'react';
import { PlayCircleIcon, Cog6ToothIcon, WrenchScrewdriverIcon, ArrowPathIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ModalForm, Button, Card, SkeletonCard } from '../DaisyUI';

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
  

  
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  
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

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

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
      
      setSnackbar({ open: true, message: 'MCP server added successfully', severity: 'success' });
      handleCloseDialog();
      fetchServers();
    } catch {
      setSnackbar({ open: true, message: 'Error adding MCP server', severity: 'error' });
    }
  };

  const handleConnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}/connect`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to connect to server');
      
      setSnackbar({ open: true, message: 'MCP server connected successfully', severity: 'success' });
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error connecting to MCP server', severity: 'error' });
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}/disconnect`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to disconnect from server');
      
      setSnackbar({ open: true, message: 'MCP server disconnected successfully', severity: 'success' });
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error disconnecting from MCP server', severity: 'error' });
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    if (!confirm(`Are you sure you want to delete the MCP server "${serverName}"?`)) return;
    
    try {
      const response = await fetch(`/api/admin/mcp/servers/${serverName}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete server');
      
      setSnackbar({ open: true, message: 'MCP server deleted successfully', severity: 'success' });
      fetchServers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting MCP server', severity: 'error' });
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
      
      setSnackbar({ 
        open: true, 
        message: `Tool executed successfully: ${JSON.stringify(result.result).substring(0, 100)}...`, 
        severity: 'success' 
      });
      setOpenToolDialog(false);
    } catch (error) {
      setSnackbar({ open: true, message: `Tool execution failed: ${error}`, severity: 'error' });
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverName]: !prev[serverName]
    }));
  };


  if (loading) {
    return <p className="text-lg">Loading MCP servers...</p>;
  }

  if (error) {
    return <p className="text-lg text-error">{error}</p>;
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

  const renderServersTab = () => (
    <div>
      {servers.length === 0 ? (
        <p className="text-lg">No MCP servers configured</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servers.map((server) => (
            <div key={server.name}>
              <Card>
                <div className="card-body">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="card-title">{server.name}</h2>
                        <div className="flex items-center gap-1">
                            {server.connected ? (
                            <div className="badge badge-success gap-2">
                                <CheckCircleIcon className="h-4 w-4" />
                                Connected
                            </div>
                            ) : (
                            <div className="badge badge-error gap-2">
                                <XCircleIcon className="h-4 w-4" />
                                Disconnected
                            </div>
                            )}
                        </div>
                    </div>
                
                    <p className="text-sm text-gray-500 mb-2">{server.url}</p>
                
                    {server.error && (
                    <div className="alert alert-error mb-2">
                      <div className="flex-1">
                        <label>{server.error}</label>
                      </div>
                    </div>
                    )}
                
                    {server.tools && server.tools.length > 0 && (
                    <div className="mb-2">
                        <p className="text-xs text-gray-500">
                            Tools Available: {server.tools.length}
                        </p>
                        <button
                            className="btn btn-link btn-xs"
                            onClick={() => toggleServerExpanded(server.name)}
                            >
                            {expandedServers[server.name] ? 'Hide' : 'Show'} Tools
                            <ChevronDownIcon className={`h-4 w-4 transform transition-transform ${expandedServers[server.name] ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className={`collapse-content ${expandedServers[server.name] ? 'block' : 'hidden'}`}>
                            <div className="mt-2">
                                {server.tools.map((tool, index) => (
                                <div key={index} className="card bordered bg-base-200 mb-1">
                                    <div className="card-body p-2">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-sm">{tool.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {tool.description}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                setSelectedTool({ ...tool, serverName: server.name });
                                                setOpenToolDialog(true);
                                                }}
                                                >
                                                <PlayCircleIcon className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    )}
                
                    {server.lastConnected && (
                    <p className="text-xs text-gray-500">
                        Last connected: {new Date(server.lastConnected).toLocaleString()}
                    </p>
                    )}
                
                    <div className="card-actions justify-end mt-2">
                        {server.connected ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            color="error"
                            onClick={() => handleDisconnect(server.name)}
                            >
                            Disconnect
                        </Button>
                        ) : (
                        <Button
                            size="sm"
                            color="primary"
                            onClick={() => handleConnect(server.name)}
                            >
                            Connect
                        </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            color="error"
                            onClick={() => handleDeleteServer(server.name)}
                            >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderToolsTab = () => {
    const allTools = getAllTools();
    
    return (
      <div>
        {allTools.length === 0 ? (
          <p>No tools available from connected MCP servers</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Tool Name</th>
                  <th>Description</th>
                  <th>Server</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allTools.map((tool) => (
                  <tr key={`${tool.serverName}-${tool.name}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-5 w-5" />
                        <span>{tool.name}</span>
                      </div>
                    </td>
                    <td>{tool.description}</td>
                    <td>
                      <div className="badge badge-primary">{tool.serverName}</div>
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
                        <PlayCircleIcon className="h-5 w-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 mt-3 bg-base-100 rounded-box shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">MCP Server Manager</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={fetchServers}
            disabled={loading}
            className="btn-square"
          >
            <ArrowPathIcon className="h-6 w-6" />
          </Button>
          <Button
            color="primary"
            onClick={handleOpenDialog}
          >
            <PlusIcon className="h-6 w-6 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      <div role="tablist" className="tabs tabs-lifted">
        <a role="tab" className={`tab ${currentTab === 0 ? 'tab-active' : ''}`} onClick={() => setCurrentTab(0)}>
          <Cog6ToothIcon className="h-5 w-5 mr-2" />
          Servers ({servers.length})
        </a>
        <a role="tab" className={`tab ${currentTab === 1 ? 'tab-active' : ''}`} onClick={() => setCurrentTab(1)}>
          <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
          Tools ({getAllTools().length})
        </a>
      </div>

      <div className="p-4 bg-base-200 rounded-b-box">
        {loading ? (
          <div>
            {currentTab === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="card bg-base-100 shadow-xl" key={index}>
                    <div className="card-body">
                      <div className="skeleton h-6 w-3/4 mb-2"></div>
                      <div className="skeleton h-4 w-full mb-4"></div>
                      <div className="skeleton h-4 w-1/2 mb-4"></div>
                      <div className="flex gap-2">
                        <div className="skeleton h-8 w-20"></div>
                        <div className="skeleton h-8 w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th><div className="skeleton h-4 w-24"></div></th>
                      <th><div className="skeleton h-4 w-32"></div></th>
                      <th><div className="skeleton h-4 w-20"></div></th>
                      <th><div className="skeleton h-4 w-16"></div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td><div className="skeleton h-4 w-28"></div></td>
                        <td><div className="skeleton h-4 w-40"></div></td>
                        <td><div className="skeleton h-4 w-16"></div></td>
                        <td><div className="skeleton h-8 w-8 rounded"></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <div className="flex-1">
              <label>{error}</label>
            </div>
          </div>
        ) : (
          <>
            {currentTab === 0 && renderServersTab()}
            {currentTab === 1 && renderToolsTab()}
          </>
        )}
      </div>
      
      {/* Add Server Dialog */}
      <ModalForm
        isOpen={openDialog}
        onClose={handleCloseDialog}
        title="Add MCP Server"
        onSubmit={handleFormSubmit}
        submitText="Add Server"
        size="md"
        fields={[
          {
            name: 'name',
            label: 'Server Name',
            type: 'text',
            required: true,
            placeholder: 'Enter server name',
            helperText: 'Unique identifier for this MCP server'
          },
          {
            name: 'serverUrl',
            label: 'Server URL',
            type: 'text',
            required: true,
            placeholder: 'e.g., stdio://path/to/server or http://localhost:3000',
            helperText: 'MCP server connection URL'
          },
          {
            name: 'apiKey',
            label: 'API Key (optional)',
            type: 'text',
            required: false,
            placeholder: 'Enter API key if required',
            helperText: 'Authentication key for the server'
          }
        ]}
      />

      {/* Tool Test Dialog */}
      <div className={`modal ${openToolDialog ? 'modal-open' : ''}`}>
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg">Test Tool: {selectedTool?.name}</h3>
          {selectedTool && (
            <div className="py-4">
              <p className="text-sm text-gray-500 mb-2">
                {selectedTool.description}
              </p>

              <p className="font-bold mb-1">
                Input Schema:
              </p>
              <div className="p-2 mb-2 bg-gray-100 rounded">
                <pre className="text-xs">
                  {JSON.stringify(selectedTool.inputSchema, null, 2)}
                </pre>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tool Arguments (JSON)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  placeholder="Enter arguments as a JSON object"
                  value={toolTestArgs}
                  onChange={(e) => setToolTestArgs(e.target.value)}
                ></textarea>
              </div>
            </div>
          )}
          <div className="modal-action">
            <button className="btn" onClick={() => setOpenToolDialog(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleTestTool}>
              <PlayCircleIcon className="h-5 w-5 mr-2" />
              Execute Tool
            </button>
          </div>
        </div>
      </div>
      
      {snackbar.open && (
        <div className="toast toast-top toast-end">
          <div className={`alert alert-${snackbar.severity}`}>
              <span>{snackbar.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPServerManager;