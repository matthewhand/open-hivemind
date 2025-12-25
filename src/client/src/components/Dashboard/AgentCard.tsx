import React, { useState, useEffect } from 'react';
import {
  Card,
  Chip,
  Select,
  Button,
  Alert,
  Tooltip,
} from '../../DaisyUI';
import { Input } from '../../DaisyUI';
import type { Agent } from '../../../services/agentService';
import { useProviders, type ProviderInfo } from '../../../hooks/useProviders';
import { usePersonas } from '../../../hooks/usePersonas';
import { CheckCircle, X, Trash2, Plus, Info } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  configurable?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, configurable }) => {
  const [llmProvider, setLlmProvider] = useState(agent.llmProvider || '');
  const [messengerProvider, setMessengerProvider] = useState(agent.provider || '');
  const [persona, setPersona] = useState(agent.persona || '');
  const [systemInstruction, setSystemInstruction] = useState(agent.systemInstruction || '');
  const [mcpServers, setMcpServers] = useState<any[]>(agent.mcpServers || []);
  const [mcpGuard, setMcpGuard] = useState<any>(agent.mcpGuard || { enabled: false, type: 'owner' });
  const [newMcpServer, setNewMcpServer] = useState({ name: '', serverUrl: '', apiKey: '' });
  const [connected, setConnected] = useState(false);

  const { llmProviders, messengerProviders, loading: providersLoading, error: providersError } = useProviders();

  const fallbackMessengerProviders: ProviderInfo[] = [
    { key: 'discord', label: 'Discord' },
    { key: 'slack', label: 'Slack' },
    { key: 'mattermost', label: 'Mattermost' },
  ];

  const fallbackLlmProviders: ProviderInfo[] = [
    { key: 'openai', label: 'OpenAI' },
    { key: 'flowise', label: 'Flowise' },
    { key: 'openwebui', label: 'OpenWebUI' },
  ];

  const messengerOptions = messengerProviders.length ? messengerProviders : fallbackMessengerProviders;
  const llmOptions = llmProviders.length ? llmProviders : fallbackLlmProviders;
  const { personas, loading: personasLoading, error: personasError } = usePersonas();

  useEffect(() => {
    setLlmProvider(agent.llmProvider || '');
    setMessengerProvider(agent.provider || '');
    setPersona(agent.persona || '');
    setSystemInstruction(agent.systemInstruction || '');
    setMcpServers(agent.mcpServers || []);
    setMcpGuard(agent.mcpGuard || { enabled: false, type: 'owner' });
  }, [agent]);

  const handleLlmChange = (event: any) => {
    setLlmProvider(event.target.value);
    updateConnectionStatus(event.target.value, messengerProvider, persona);
  };

  const handleMessengerChange = (event: any) => {
    setMessengerProvider(event.target.value);
    updateConnectionStatus(llmProvider, event.target.value, persona);
  };

  const handlePersonaChange = (event: any) => {
    setPersona(event.target.value);
    updateConnectionStatus(llmProvider, messengerProvider, event.target.value);
  };

  const handleSystemInstructionChange = (event: any) => {
    setSystemInstruction(event.target.value);
  };

  const handleMcpGuardChange = (field: string, value: any) => {
    setMcpGuard((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddMcpServer = () => {
    if (newMcpServer.name && newMcpServer.serverUrl) {
      setMcpServers([...mcpServers, newMcpServer]);
      setNewMcpServer({ name: '', serverUrl: '', apiKey: '' });
    }
  };

  const handleRemoveMcpServer = (index: number) => {
    const updatedServers = [...mcpServers];
    updatedServers.splice(index, 1);
    setMcpServers(updatedServers);
  };

  const updateConnectionStatus = (llm: string, messenger: string, p: string) => {
    if (llm && messenger && p) {
      // Simulate connection attempt
      setTimeout(() => {
        setConnected(true);
      }, 1000);
    } else {
      setConnected(false);
    }
  };

  const isConfigured = llmProvider && messengerProvider && persona;

  // Check for environment variable overrides
  const hasEnvOverrides = agent.envOverrides && Object.keys(agent.envOverrides).length > 0;

  if (!configurable) {
    return (
      <Card className="w-full">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <h3 className="card-title text-lg">{agent.name}</h3>
            <Chip variant="success" size="sm">online</Chip>
          </div>
          <div className="mt-2">
            <p className="text-sm">Provider: {agent.provider}</p>
            {agent.persona && <p className="text-sm">Persona: {agent.persona}</p>}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${!isConfigured ? 'line-through' : ''} ${hasEnvOverrides ? 'border-2 border-info' : ''}`}>
      <div className="card-body">
        <div className="flex justify-between items-center">
          <h3 className="card-title text-lg">
            {agent.name}
            {hasEnvOverrides && (
              <Tooltip content="This agent has environment variable overrides">
                <Info className="w-4 h-4 ml-1 text-info" />
              </Tooltip>
            )}
          </h3>
          <div className="flex gap-2">
            {isConfigured ? <CheckCircle className="w-5 h-5 text-success" /> : <X className="w-5 h-5 text-error" />}
            {connected ? <CheckCircle className="w-5 h-5 text-success" /> : <X className="w-5 h-5 text-error" />}
          </div>
        </div>
        
        {hasEnvOverrides && (
          <div className="mt-2 mb-4">
            <Alert status="info" message="This agent has environment variable overrides. Some fields are read-only." />
          </div>
        )}
        
        <div className="mt-4 space-y-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">LLM Provider</span>
            </label>
            <Select
              value={llmProvider}
              onChange={handleLlmChange}
              disabled={providersLoading || (agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_LLM_PROVIDER']?.isOverridden)}
              options={llmOptions.map((provider) => ({
                value: provider.key,
                label: provider.label,
                disabled: false,
              }))}
            >
              {llmOptions.map((provider) => (
                <option key={provider.key} value={provider.key}>
                  {provider.label}
                </option>
              ))}
            </Select>
            {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_LLM_PROVIDER']?.isOverridden && (
              <div className="mt-1">
                <Chip variant="info" size="sm">
                  ENV: {agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_LLM_PROVIDER']?.redactedValue}
                </Chip>
              </div>
            )}
          </div>
          
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Messenger Provider</span>
            </label>
            <Select
              value={messengerProvider}
              onChange={handleMessengerChange}
              disabled={providersLoading || (agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_PROVIDER']?.isOverridden)}
              options={messengerOptions.map((provider) => ({
                value: provider.key,
                label: provider.label,
                disabled: false,
              }))}
            >
              {messengerOptions.map((provider) => (
                <option key={provider.key} value={provider.key}>
                  {provider.label}
                </option>
              ))}
            </Select>
            {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_PROVIDER']?.isOverridden && (
              <div className="mt-1">
                <Chip variant="info" size="sm">
                  ENV: {agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_PROVIDER']?.redactedValue}
                </Chip>
              </div>
            )}
          </div>
          
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Persona</span>
            </label>
            <Select
              value={persona}
              onChange={handlePersonaChange}
              disabled={personasLoading || (agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_PERSONA']?.isOverridden)}
              options={personas.map((p) => ({
                value: p.key,
                label: p.name,
                disabled: false,
              }))}
            >
              {personas.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </Select>
            {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_PERSONA']?.isOverridden && (
              <div className="mt-1">
                <Chip variant="info" size="sm">
                  ENV: {agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_PERSONA']?.redactedValue}
                </Chip>
              </div>
            )}
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">System Instruction</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              value={systemInstruction}
              onChange={handleSystemInstructionChange}
              disabled={agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_SYSTEM_INSTRUCTION']?.isOverridden}
            />
            {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_SYSTEM_INSTRUCTION']?.isOverridden && (
              <label className="label">
                <span className="label-text-alt">
                  Overridden by ENV: {agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_SYSTEM_INSTRUCTION']?.redactedValue}
                </span>
              </label>
            )}
          </div>
          
          {/* MCP Servers Section */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-2">MCP Servers</h4>
            <ul className="space-y-2">
              {mcpServers.map((server, index) => (
                <li key={index} className="flex justify-between items-center p-2 bg-base-200 rounded">
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-base-content/70">{server.serverUrl}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMcpServer(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Server Name"
              value={newMcpServer.name}
              onChange={(e) => setNewMcpServer({...newMcpServer, name: e.target.value})}
              size="sm"
              className="flex-1"
            />
            <Input
              placeholder="Server URL"
              value={newMcpServer.serverUrl}
              onChange={(e) => setNewMcpServer({...newMcpServer, serverUrl: e.target.value})}
              size="sm"
              className="flex-1"
            />
            <Button
              variant="secondary" className="btn-outline"
              startIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddMcpServer}
              disabled={!newMcpServer.name || !newMcpServer.serverUrl}
              size="sm"
            >
              Add
            </Button>
          </div>
          
          {/* MCP Guard Section */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-2">MCP Tool Usage Guard</h4>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Enable MCP Tool Usage Guard</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={mcpGuard.enabled}
                  onChange={(e) => handleMcpGuardChange('enabled', e.target.checked)}
                />
              </label>
            </div>
            
            {mcpGuard.enabled && (
              <div className="mt-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Guard Type</span>
                  </label>
                  <Select
                    value={mcpGuard.type}
                    onChange={(e) => handleMcpGuardChange('type', e.target.value)}
                    options={[
                      { value: 'owner', label: 'Forum Owner Only', disabled: false },
                      { value: 'custom', label: 'Custom User List', disabled: false },
                    ]}
                  >
                    <option value="owner">Forum Owner Only</option>
                    <option value="custom">Custom User List</option>
                  </Select>
                </div>
                
                {mcpGuard.type === 'custom' && (
                  <div className="form-control mt-4">
                    <label className="label">
                      <span className="label-text">Allowed User IDs (comma-separated)</span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-16"
                      value={mcpGuard.allowedUserIds?.join(', ') || ''}
                      onChange={(e) => handleMcpGuardChange('allowedUserIds', e.target.value.split(',').map(id => id.trim()))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AgentCard;
