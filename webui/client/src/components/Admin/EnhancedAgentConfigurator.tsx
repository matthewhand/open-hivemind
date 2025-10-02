import React, { useState, useEffect } from 'react';
import { Modal, Pagination } from '../DaisyUI';
import AgentForm from './AgentForm';

interface Agent {
  id: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers: string[];
  mcpGuard: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds: string[];
  };
  isActive: boolean;
  isRunning?: boolean;
  envOverrides?: Record<string, { isOverridden: boolean; redactedValue?: string }>;
}

interface Provider {
  id: string;
  name: string;
  description: string;
  configRequired: string[];
  envVarPrefix: string;
}

interface Persona {
  key: string;
  name: string;
  systemPrompt: string;
}

interface MCPServer {
  name: string;
  url: string;
  connected: boolean;
  tools?: Array<{ name: string; description: string }>;
}

const EnhancedAgentConfigurator: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messageProviders, setMessageProviders] = useState<Provider[]>([]);
  const [llmProviders, setLlmProviders] = useState<Provider[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // Show 12 agents per page (3x4 grid)

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsRes, providersRes, personasRes, mcpRes] = await Promise.all([
        fetch('/api/admin/agents'),
        fetch('/api/admin/providers'),
        fetch('/api/admin/agents/personas'),
        fetch('/api/admin/mcp/servers')
      ]);

      const [agentsData, providersData, personasData, mcpData] = await Promise.all([
        agentsRes.json(),
        providersRes.json(),
        personasRes.json(),
        mcpRes.json()
      ]);

      setAgents(agentsData.agents || []);
      setMessageProviders(providersData.messageProviders || []);
      setLlmProviders(providersData.llmProviders || []);
      setPersonas(personasData.personas || []);
      setMcpServers(mcpData.servers || []);
    } catch (err) {
      setError('Failed to fetch configuration data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setOpenCreateDialog(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setOpenCreateDialog(true);
  };

  const handleSaveAgent = async (agentData: Partial<Agent>) => {
    try {
      if (editingAgent) {
        // Update existing agent
        const response = await fetch(`/api/admin/agents/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!response.ok) throw new Error('Failed to update agent');
      } else {
        // Create new agent
        const response = await fetch('/api/admin/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!response.ok) throw new Error('Failed to create agent');
      }

      setOpenCreateDialog(false);
      fetchData();
    } catch (err) {
      setError(`Failed to save agent: ${err}`);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const response = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete agent');
      fetchData();
    } catch (err) {
      setError(`Failed to delete agent: ${err}`);
    }
  };

  const handleToggleAgent = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/admin/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...agent, isActive: !agent.isActive })
      });
      if (!response.ok) throw new Error('Failed to toggle agent');
      fetchData();
    } catch (err) {
      setError(`Failed to toggle agent: ${err}`);
    }
  };

  const getAgentStatus = (agent: Agent) => {
    const hasMessageProvider = agent.messageProvider && messageProviders.some(p => p.id === agent.messageProvider);
    const hasLlmProvider = agent.llmProvider && llmProviders.some(p => p.id === agent.llmProvider);
    const hasOverrides = agent.envOverrides && Object.keys(agent.envOverrides).length > 0;

    if (!hasMessageProvider || !hasLlmProvider) {
      return { status: 'incomplete', color: 'text-red-500 border-red-500', icon: '✗' };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: 'text-orange-500 border-orange-500', icon: '⚠' };
    }
    if (agent.isRunning) {
      return { status: 'running', color: 'text-green-500 border-green-500', icon: '✓' };
    }
    if (agent.isActive) {
      return { status: 'ready', color: 'text-green-300 border-green-300', icon: '✓' };
    }
    return { status: 'inactive', color: 'text-gray-500 border-gray-500', icon: '✗' };
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination
  const totalAgents = agents.length;
  const totalPages = Math.ceil(totalAgents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAgents = agents.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Agent Configuration
        </h1>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={fetchData}
          >
            <span className="mr-2">↻</span>
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreateAgent}
          >
            <span className="mr-2">+</span>
            Create Agent
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button className="btn btn-sm btn-circle btn-outline" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedAgents.map((agent) => {
          const status = getAgentStatus(agent);
          return (
            <div key={agent.id} className={`card bg-base-100 shadow-xl border-2 ${status.color} h-full`}>
              <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="card-title flex-grow">
                    {agent.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${status.color}`}>{status.icon}</span>
                    <span className={`text-sm ${status.color}`}>
                      {status.status}
                    </span>
                  </div>
                </div>

                {/* Provider Configuration */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-500">Message Provider</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`badge ${agent.messageProvider ? 'badge-primary' : 'badge-ghost'}`}>
                      {agent.messageProvider || 'Not Set'}
                    </div>
                    {agent.envOverrides && Object.keys(agent.envOverrides).some(key =>
                      key.toLowerCase().includes(agent.messageProvider?.toLowerCase() || '')
                    ) && (
                      <div className="tooltip" data-tip="Environment variable override active">
                        <span className="text-warning">⚙</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-500">LLM Provider</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`badge ${agent.llmProvider ? 'badge-secondary' : 'badge-ghost'}`}>
                      {agent.llmProvider || 'Not Set'}
                    </div>
                    {agent.envOverrides && Object.keys(agent.envOverrides).some(key =>
                      key.toLowerCase().includes(agent.llmProvider?.toLowerCase() || '')
                    ) && (
                      <div className="tooltip" data-tip="Environment variable override active">
                        <span className="text-warning">⚙</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Persona */}
                {agent.persona && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-500">Persona</h4>
                    <div className="badge badge-outline mt-1">
                      {personas.find(p => p.key === agent.persona)?.name || agent.persona}
                    </div>
                  </div>
                )}

                {/* MCP Servers */}
                {agent.mcpServers.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-500">
                      MCP Servers ({agent.mcpServers.length})
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.mcpServers.slice(0, 3).map((serverName) => {
                        const server = mcpServers.find(s => s.name === serverName);
                        return (
                          <div key={serverName} className={`badge ${server?.connected ? 'badge-success' : 'badge-ghost'}`}>
                            {serverName}
                          </div>
                        );
                      })}
                      {agent.mcpServers.length > 3 && (
                        <div className="badge badge-outline">
                          {`+${agent.mcpServers.length - 3} more`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MCP Guard */}
                {agent.mcpGuard.enabled && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">🛡️</span>
                      <h4 className="text-sm font-semibold text-gray-500">
                        MCP Guard: {agent.mcpGuard.type}
                      </h4>
                    </div>
                  </div>
                )}

                {/* Environment Overrides Warning */}
                {agent.envOverrides && Object.keys(agent.envOverrides).length > 0 && (
                  <div className="alert alert-warning mt-4 mb-4">
                    <div className="text-xs">
                      {Object.keys(agent.envOverrides).length} environment variable override(s) active
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="card-actions justify-between items-center mt-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text mr-2">Active</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-sm"
                        checked={agent.isActive}
                        onChange={() => handleToggleAgent(agent)}
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <span role="img" aria-label="settings">⚙️</span>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <span role="img" aria-label="delete">🗑️</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination
            currentPage={currentPage}
            totalItems={totalAgents}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            style="standard"
          />
        </div>
      )}

      {/* Create/Edit Agent Modal */}
      <Modal
        isOpen={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        title={editingAgent ? 'Edit Agent' : 'Create New Agent'}
        size="xl"
      >
        <AgentForm
          agent={editingAgent}
          messageProviders={messageProviders}
          llmProviders={llmProviders}
          personas={personas}
          mcpServers={mcpServers}
          onSubmit={handleSaveAgent}
          onCancel={() => setOpenCreateDialog(false)}
        />
      </Modal>
    </div>
  );
};

export default EnhancedAgentConfigurator;