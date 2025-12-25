import React, { useState, useEffect } from 'react';
import {
  WrenchScrewdriverIcon as ToolIcon,
  PlayIcon as RunIcon,
  MagnifyingGlassIcon as SearchIcon,
} from '@heroicons/react/24/outline';
import { Breadcrumbs, Alert } from '../components/DaisyUI';

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
    { label: 'MCP', href: '/uber/mcp' },
    { label: 'Tools', href: '/uber/mcp/tools', isActive: true },
  ];

  // Mock tools - in real app this would come from API
  const mockTools: MCPTool[] = [
    {
      id: '1',
      name: 'github_create_issue',
      serverId: '1',
      serverName: 'GitHub Integration',
      description: 'Create a new issue in a GitHub repository',
      category: 'git',
      inputSchema: { repository: 'string', title: 'string', body: 'string' },
      outputSchema: { issueNumber: 'number', url: 'string' },
      usageCount: 45,
      lastUsed: '2024-01-15T10:30:00Z',
      enabled: true,
    },
    {
      id: '2',
      name: 'github_list_repos',
      serverId: '1',
      serverName: 'GitHub Integration',
      description: 'List all repositories for a user or organization',
      category: 'git',
      inputSchema: { owner: 'string', type: 'string' },
      outputSchema: { repositories: 'array' },
      usageCount: 23,
      lastUsed: '2024-01-14T16:45:00Z',
      enabled: true,
    },
    {
      id: '3',
      name: 'db_query',
      serverId: '2',
      serverName: 'Database Tools',
      description: 'Execute a SQL query against the database',
      category: 'database',
      inputSchema: { query: 'string', parameters: 'array' },
      outputSchema: { rows: 'array', count: 'number' },
      usageCount: 78,
      lastUsed: '2024-01-15T09:15:00Z',
      enabled: true,
    },
    {
      id: '4',
      name: 'db_backup',
      serverId: '2',
      serverName: 'Database Tools',
      description: 'Create a backup of the database',
      category: 'database',
      inputSchema: { tables: 'array', compression: 'boolean' },
      outputSchema: { backupPath: 'string', size: 'number' },
      usageCount: 12,
      lastUsed: '2024-01-13T14:20:00Z',
      enabled: false,
    },
    {
      id: '5',
      name: 'fs_read_file',
      serverId: '3',
      serverName: 'File System',
      description: 'Read contents of a file',
      category: 'filesystem',
      inputSchema: { path: 'string', encoding: 'string' },
      outputSchema: { content: 'string', size: 'number' },
      usageCount: 156,
      lastUsed: '2024-01-12T11:30:00Z',
      enabled: true,
    },
    {
      id: '6',
      name: 'api_call',
      serverId: '4',
      serverName: 'API Gateway',
      description: 'Make HTTP requests to external APIs',
      category: 'network',
      inputSchema: { url: 'string', method: 'string', headers: 'object' },
      outputSchema: { response: 'object', status: 'number' },
      usageCount: 34,
      lastUsed: '2024-01-10T08:15:00Z',
      enabled: true,
    },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setTools(mockTools);
      setFilteredTools(mockTools);
      setLoading(false);
    }, 1000);
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
    };
    return colors[category] || 'badge-ghost';
  };

  const handleRunTool = async (tool: MCPTool) => {
    try {
      // Simulate tool execution
      setAlert({ type: 'success', message: `Tool "${tool.name}" executed successfully` });

      // Update usage count
      setTools(prev => prev.map(t =>
        t.id === tool.id
          ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
          : t,
      ));
    } catch (error) {
      setAlert({ type: 'error', message: `Failed to execute tool "${tool.name}"` });
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
      <div className="p-6 text-center">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-2">Loading MCP tools...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">
          MCP Tools
        </h1>
        <p className="text-base-content/70">
          Browse and manage tools available from your MCP servers
        </p>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="form-control w-full md:w-auto md:flex-1 max-w-md">
          <div className="input-group">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search tools..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon className="w-5 h-5 absolute left-3 top-3 text-base-content/50" />
            </div>
          </div>
        </div>

        <select
          className="select select-bordered w-full md:w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered w-full md:w-auto"
          value={serverFilter}
          onChange={(e) => setServerFilter(e.target.value)}
        >
          <option value="all">All Servers</option>
          {servers.map(server => (
            <option key={server.id} value={server.id}>
              {server.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-base-content/70 mb-4">
        Showing {filteredTools.length} of {tools.length} tools
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <div key={tool.id} className="card bg-base-100 shadow-xl h-full">
            <div className="card-body">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <ToolIcon className="w-5 h-5 text-base-content/70" />
                  <h2 className="card-title text-lg">
                    {tool.name}
                  </h2>
                </div>
                <div className={`badge ${tool.enabled ? 'badge-success' : 'badge-ghost'}`}>
                  {tool.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <p className="text-sm text-base-content/70 mb-4">
                {tool.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <div className={`badge ${getCategoryColor(tool.category)}`}>
                  {tool.category}
                </div>
                <div className="badge badge-outline">{tool.serverName}</div>
              </div>

              <div className="text-xs space-y-1 mb-4">
                <p><strong>Usage:</strong> {tool.usageCount} times</p>
                {tool.lastUsed && (
                  <p className="text-base-content/50">
                    Last used: {new Date(tool.lastUsed).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="card-actions justify-between mt-auto">
                <button
                  className={`btn btn-sm ${tool.enabled ? 'btn-error btn-outline' : 'btn-success btn-outline'}`}
                  onClick={() => handleToggleTool(tool.id)}
                >
                  {tool.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRunTool(tool)}
                  disabled={!tool.enabled}
                >
                  <RunIcon className="w-4 h-4 mr-1" />
                  Run Tool
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && !loading && (
        <div className="text-center mt-12">
          <h3 className="text-lg font-medium text-base-content/70">
            No tools found
          </h3>
          <p className="text-sm text-base-content/50 mt-1">
            Try adjusting your search criteria or add more MCP servers
          </p>
        </div>
      )}
    </div>
  );
};

export default MCPToolsPage;