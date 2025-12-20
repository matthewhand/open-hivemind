import React, { useState, useEffect } from 'react';
import { Badge, Alert, Button } from '../DaisyUI';
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
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
  const [pageSize] = useState(12);

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
        const response = await fetch(`/api/admin/agents/${editingAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentData)
        });
        if (!response.ok) throw new Error('Failed to update agent');
      } else {
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
      return { status: 'incomplete', color: 'error', icon: <XCircleIcon className="w-5 h-5" /> };
    }
    if (hasOverrides) {
      return { status: 'env-override', color: 'warning', icon: <ExclamationTriangleIcon className="w-5 h-5" /> };
    }
    if (agent.isRunning) {
      return { status: 'running', color: 'success', icon: <CheckCircleIcon className="w-5 h-5" /> };
    }
    if (agent.isActive) {
      return { status: 'ready', color: 'success', icon: <CheckCircleIcon className="w-5 h-5" /> };
    }
    return { status: 'inactive', color: 'ghost', icon: <XCircleIcon className="w-5 h-5" /> };
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalAgents = agents.length;
  const totalPages = Math.ceil(totalAgents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAgents = agents.slice(startIndex, endIndex);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[200px]"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Agent Configuration</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            startIcon={<ArrowPathIcon className="w-5 h-5" />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            startIcon={<PlusIcon className="w-5 h-5" />}
            onClick={handleCreateAgent}
          >
            Create Agent
          </Button>
        </div>
      </div>

      {error && (
        <Alert status="error" message={error} onClose={() => setError(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedAgents.map((agent) => {
          const status = getAgentStatus(agent);
          return (
            <div
              key={agent.id}
              className={`card bg-base-100 shadow-xl border-2 border-${status.color}`}
            >
              <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="card-title flex-1">{agent.name}</h3>
                  <div className={`flex items-center gap-1 text-${status.color}`}>
                    {status.icon}
                    <span className="text-xs">{status.status}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Message Provider */}
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">Message Provider</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.messageProvider ? 'primary' : 'neutral'}>
                        {agent.messageProvider || 'Not Set'}
                      </Badge>
                      {agent.envOverrides && Object.keys(agent.envOverrides).some(key =>
                        key.toLowerCase().includes(agent.messageProvider?.toLowerCase() || '')
                      ) && (
                          <Cog6ToothIcon className="w-4 h-4 text-warning" title="Environment variable override active" />
                        )}
                    </div>
                  </div>

                  {/* LLM Provider */}
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">LLM Provider</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={agent.llmProvider ? 'secondary' : 'neutral'}>
                        {agent.llmProvider || 'Not Set'}
                      </Badge>
                      {agent.envOverrides && Object.keys(agent.envOverrides).some(key =>
                        key.toLowerCase().includes(agent.llmProvider?.toLowerCase() || '')
                      ) && (
                          <Cog6ToothIcon className="w-4 h-4 text-warning" title="Environment variable override active" />
                        )}
                    </div>
                  </div>

                  {/* Persona */}
                  {agent.persona && (
                    <div>
                      <p className="text-sm text-base-content/60 mb-1">Persona</p>
                      <Badge variant="primary">
                        {personas.find(p => p.key === agent.persona)?.name || agent.persona}
                      </Badge>
                    </div>
                  )}

                  {/* MCP Servers */}
                  {agent.mcpServers.length > 0 && (
                    <div>
                      <p className="text-sm text-base-content/60 mb-1">MCP Servers ({agent.mcpServers.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.mcpServers.slice(0, 3).map((serverName) => {
                          const server = mcpServers.find(s => s.name === serverName);
                          return (
                            <Badge
                              key={serverName}
                              variant={server?.connected ? 'success' : 'neutral'}
                            >
                              {serverName}
                            </Badge>
                          );
                        })}
                        {agent.mcpServers.length > 3 && (
                          <Badge variant="neutral">+{agent.mcpServers.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MCP Guard */}
                  {agent.mcpGuard.enabled && (
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="w-4 h-4 text-primary" />
                      <p className="text-sm text-base-content/60">
                        MCP Guard: {agent.mcpGuard.type}
                      </p>
                    </div>
                  )}

                  {/* Environment Overrides Warning */}
                  {agent.envOverrides && Object.keys(agent.envOverrides).length > 0 && (
                    <Alert status="warning" message={`${Object.keys(agent.envOverrides).length} environment variable override(s) active`} />
                  )}
                </div>

                {/* Actions */}
                <div className="card-actions justify-between items-center mt-4">
                  <div className="form-control">
                    <label className="label cursor-pointer gap-2">
                      <span className="label-text">Active</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={agent.isActive}
                        onChange={() => handleToggleAgent(agent)}
                      />
                    </label>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-sm btn-circle btn-ghost"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                    <button
                      className="btn btn-sm btn-circle btn-error btn-ghost"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      <TrashIcon className="w-4 h-4" />
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