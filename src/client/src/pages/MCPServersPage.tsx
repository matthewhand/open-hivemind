/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  PageHeader,
  StatsCards,
  EmptyState,
  Alert
} from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
import MCPServerCard, { MCPServer } from '../components/MCP/MCPServerCard';
import MCPServerModal, { MCPServerFormData } from '../components/MCP/MCPServerModal';
import MCPToolsModal from '../components/MCP/MCPToolsModal';
import { apiService } from '../services/api';

const MCPServersPage: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServerFormData | null>(null);
  const [viewingTools, setViewingTools] = useState<{ name: string; tools: any[] }>({ name: '', tools: [] });

  // Alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Fetch MCP servers from API
  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getMcpServers();
      const data = response.data;

      // Map API response to MCPServer format
      const connectedServers: MCPServer[] = (data.servers || []).map((server: any, index: number) => ({
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
      const storedConfigs: MCPServer[] = (data.configurations || []).map((config: any, index: number) => {
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
          apiKey: config.apiKey
        };
      }).filter(Boolean) as MCPServer[];

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
  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      const matchesSearch =
        server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.url.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || server.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [servers, searchTerm, statusFilter]);

  const stats = [
    {
      id: 'total-servers',
      title: 'Total Servers',
      value: servers.length,
      icon: <Server className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'active-servers',
      title: 'Active Servers',
      value: servers.filter(s => s.status === 'running').length,
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'success' as const,
    },
    {
      id: 'total-tools',
      title: 'Available Tools',
      value: servers.reduce((acc, s) => acc + (s.toolCount || 0), 0),
      icon: <Wrench className="w-8 h-8" />,
      color: 'secondary' as const,
    },
    {
      id: 'error-servers',
      title: 'Errors',
      value: servers.filter(s => s.status === 'error').length,
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'error' as const,
    },
  ];

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    if (action === 'restart') {
      await handleServerAction(serverId, 'stop');
      await handleServerAction(serverId, 'start');
      return;
    }

    try {
      if (action === 'stop') {
        await apiService.disconnectMcpServer(serverId);
      } else {
        const server = servers.find(s => s.id === serverId);
        if (!server) {throw new Error('Server not found');}

        await apiService.connectMcpServer({
          name: server.name,
          serverUrl: server.url,
          apiKey: server.apiKey
        });
      }

      setAlert({ type: 'success', message: `Server ${action} action completed` });

      // Optimistic update
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: action === 'start' ? 'running' : 'stopped', error: undefined } : s));

      await fetchServers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to ${action} server`;
      setAlert({ type: 'error', message: errorMsg });

      // Optimistic update error state
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, status: 'error', error: errorMsg } : s));
    }
  };

  const handleViewTools = async (server: MCPServer) => {
    // If tools are already loaded, use them
    if (server.tools && server.tools.length > 0) {
      setViewingTools({ name: server.name, tools: server.tools });
      setToolsModalOpen(true);
      return;
    }

    try {
      const response = await apiService.testMcpServer({
        name: server.name,
        serverUrl: server.url,
        apiKey: server.apiKey
      });

      if (response && response.success) {
        const tools = response.data?.tools || [];
        setViewingTools({ name: server.name, tools });
        setToolsModalOpen(true);
      } else {
        throw new Error('Failed to fetch tools');
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to retrieve tools for this server.' });
    }
  };

  const handleSaveServer = async (data: MCPServerFormData) => {
    try {
      // Disconnect if editing existing server to ensure clean state
      if (selectedServer) {
         try {
             await apiService.disconnectMcpServer(selectedServer.name);
         } catch (e) { /* ignore disconnect errors */ }
      }

      await apiService.connectMcpServer({
        name: data.name,
        serverUrl: data.url,
        apiKey: data.apiKey
      });

      setAlert({ type: 'success', message: selectedServer ? 'Server updated successfully' : 'Server added successfully' });
      await fetchServers();
    } catch (err) {
      throw err; // Let modal handle error display
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (window.confirm('Are you sure you want to delete this server configuration? This action cannot be undone.')) {
      try {
        await apiService.deleteMcpServer(serverId);
        setAlert({ type: 'success', message: 'Server deleted successfully' });
        await fetchServers();
      } catch (err) {
        setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete server' });
      }
    }
  };

  const openAddModal = () => {
    setSelectedServer(null);
    setModalOpen(true);
  };

  const openEditModal = (server: MCPServer) => {
    setSelectedServer({
      id: server.id,
      name: server.name,
      url: server.url,
      description: server.description,
      apiKey: server.apiKey
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Servers"
        description="Manage Model Context Protocol servers to extend bot capabilities with external tools."
        icon={Server}
        actions={
          <div className="flex gap-2">
            <button
              onClick={fetchServers}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={openAddModal}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </button>
          </div>
        }
      />

      <StatsCards stats={stats} isLoading={loading && servers.length === 0} />

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {error && !alert && (
        <Alert
          status="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

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

      {loading && servers.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : filteredServers.length === 0 ? (
        <EmptyState
          icon={servers.length === 0 ? Server : Search}
          title={servers.length === 0 ? "No servers configured" : "No results found"}
          description={servers.length === 0
            ? "Connect an MCP server to get started extending your bot's capabilities."
            : `No servers match your search for "${searchTerm}".`
          }
          actionLabel={servers.length === 0 ? "Add Server" : "Clear Search"}
          onAction={servers.length === 0 ? openAddModal : () => { setSearchTerm(''); setStatusFilter('All'); }}
          variant={servers.length === 0 ? "noData" : "noResults"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => (
            <MCPServerCard
              key={server.id}
              server={server}
              onAction={handleServerAction}
              onEdit={openEditModal}
              onDelete={handleDeleteServer}
              onViewTools={handleViewTools}
            />
          ))}
        </div>
      )}

      <MCPServerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        server={selectedServer}
        onSave={handleSaveServer}
      />

      <MCPToolsModal
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        serverName={viewingTools.name}
        tools={viewingTools.tools}
      />
    </div>
  );
};

export default MCPServersPage;
