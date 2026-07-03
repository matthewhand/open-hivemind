/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import Card from '../DaisyUI/Card';
import Chip from '../DaisyUI/Chip';
import Select from '../DaisyUI/Select';
import Button from '../DaisyUI/Button';
import { Alert } from '../DaisyUI/Alert';
import Tooltip from '../DaisyUI/Tooltip';
import Input from '../DaisyUI/Input';
import type { Agent } from '../../services/agentService';
import { useProviders, type ProviderInfo } from '../../hooks/useProviders';
import { usePersonas } from '../../hooks/usePersonas';
import { CheckCircle, X, Trash2, Plus, Info } from 'lucide-react';
import Toggle from '../DaisyUI/Toggle';
import Textarea from '../DaisyUI/Textarea';

interface AgentCardProps {
  agent: Agent;
  configurable?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, configurable }) => {
  const [llmProvider, setLlmProvider] = useState(agent.llmProvider || '');
  const [messengerProvider, setMessengerProvider] = useState(agent.provider || '');
  const [persona, setPersona] = useState(agent.persona || '');
  const [systemInstruction, setSystemInstruction] = useState(agent.systemInstruction || '');
  const [mcpServers, setMcpServers] = useState<{ name: string; serverUrl: string; apiKey?: string }[]>(agent.mcpServers || []);
  const [mcpGuard, setMcpGuard] = useState<{ enabled: boolean; type: string; allowedUserIds?: string[] }>(agent.mcpGuard || { enabled: false, type: 'owner' });
  const [newMcpServer, setNewMcpServer] = useState({ name: '', serverUrl: '', apiKey: '' });
  const [connected, setConnected] = useState(false);

  const { llmProviders, messageProviders, loading: providersLoading, error: providersError } = useProviders();

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

  const messengerOptions = useMemo(
    () => (messageProviders.length ? messageProviders : fallbackMessengerProviders),
    [messageProviders]
  );
  const llmOptions = useMemo(
    () => (llmProviders.length ? llmProviders : fallbackLlmProviders),
    [llmProviders]
  );
  const { personas, loading: personasLoading, error: personasError } = usePersonas();

  useEffect(() => {
    setLlmProvider(agent.llmProvider || '');
    setMessengerProvider(agent.provider || '');
    setPersona(agent.persona || '');
    setSystemInstruction(agent.systemInstruction || '');
    setMcpServers(agent.mcpServers || []);
    setMcpGuard(agent.mcpGuard || { enabled: false, type: 'owner' });
  }, [agent]);

  const handleLlmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setLlmProvider(event.target.value);
    updateConnectionStatus(event.target.value, messengerProvider, persona);
  };

  const handleMessengerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setMessengerProvider(event.target.value);
    updateConnectionStatus(llmProvider, event.target.value, persona);
  };

  const handlePersonaChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPersona(event.target.value);
    updateConnectionStatus(llmProvider, messengerProvider, event.target.value);
  };

  const handleSystemInstructionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSystemInstruction(event.target.value);
  };

  const handleMcpGuardChange = (field: string, value: boolean | string | string[]) => {
    setMcpGuard((prev) => ({ ...prev, [field]: value }));
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

  const isConfigured = useMemo(
    () => Boolean(llmProvider && messengerProvider && persona),
    [llmProvider, messengerProvider, persona]
  );

  // Check for environment variable overrides
  const hasEnvOverrides = useMemo(
    () => Boolean(agent.envOverrides && Object.keys(agent.envOverrides).length > 0),
    [agent.envOverrides]
  );

  const handleRemoveMcpServerStable = useCallback(
    (index: number) => {
      setMcpServers((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const handleAddMcpServerStable = useCallback(() => {
    if (newMcpServer.name && newMcpServer.serverUrl) {
      setMcpServers((prev) => [...prev, newMcpServer]);
      setNewMcpServer({ name: '', serverUrl: '', apiKey: '' });
    }
  }, [newMcpServer]);

  if (!configurable) {
    return (
      <Card className="w-full">
        <Card.Body>
          <div className="flex justify-between items-center">
            <Card.Title tag="h3" className="text-lg">{agent.name}</Card.Title>
            <Chip variant="success" size="sm">online</Chip>
          </div>
          <div className="mt-2">
            <p className="text-sm">Provider: {agent.provider}</p>
            {agent.persona && <p className="text-sm">Persona: {agent.persona}</p>}
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${!isConfigured ? 'line-through' : ''} ${hasEnvOverrides ? 'border-2 border-info' : ''}`}>
      <Card.Body>
        <div className="flex justify-between items-center">
          <Card.Title tag="h3" className="text-lg">
            {agent.name}
            {hasEnvOverrides && (
              <Tooltip content="This agent has environment variable overrides">
                <Info className="w-4 h-4 ml-1 text-info" />
              </Tooltip>
            )}
          </Card.Title>
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
        
        <fieldset className="mt-4 space-y-4">
          <legend className="sr-only">Agent Configuration for {agent.name}</legend>
          <div className="form-control w-full">
            <label className="label" htmlFor={`llm-provider-${agent.name}`}>
              <span className="label-text">LLM Provider</span>
            </label>
            <Select
              id={`llm-provider-${agent.name}`}
              aria-label={`Select LLM Provider for ${agent.name}`}
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
            <label className="label" htmlFor={`messenger-provider-${agent.name}`}>
              <span className="label-text">Messenger Provider</span>
            </label>
            <Select
              id={`messenger-provider-${agent.name}`}
              aria-label={`Select Messenger Provider for ${agent.name}`}
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
            <label className="label" htmlFor={`persona-${agent.name}`}>
              <span className="label-text">Persona</span>
            </label>
            <Select
              id={`persona-${agent.name}`}
              aria-label={`Select Persona for ${agent.name}`}
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
            <label className="label cursor-pointer" htmlFor={`include-history-${agent.name}`}>
              <span className="label-text">Include Conversation History</span>
              <input
                id={`include-history-${agent.name}`}
                aria-label={`Include Conversation History for ${agent.name}`}
                type="checkbox"
                className="toggle toggle-primary"
                checked={agent.MESSAGE_INCLUDE_CONVERSATION_HISTORY !== false}
                onChange={(e) => {
                  const updatedAgent = {
                    ...agent,
                    MESSAGE_INCLUDE_CONVERSATION_HISTORY: e.target.checked
                  };
                  onUpdate(updatedAgent);
                }}
                disabled={agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_INCLUDE_CONVERSATION_HISTORY']?.isOverridden}
              />
            </label>
            <div className="label">
              <span className="label-text-alt">When enabled, bot can see and respond to other bots' messages</span>
            </div>
            {agent.envOverrides && agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_INCLUDE_CONVERSATION_HISTORY']?.isOverridden && (
              <div className="mt-1">
                <Chip variant="info" size="sm">
                  ENV: {agent.envOverrides['BOTS_' + agent.name.toUpperCase() + '_MESSAGE_INCLUDE_CONVERSATION_HISTORY']?.redactedValue}
                </Chip>
              </div>
            )}
          </div>
          
          <div className="form-control">
            <label className="label" htmlFor={`system-instruction-${agent.name}`}>
              <span className="label-text">System Instruction</span>
            </label>
            <Textarea
              id={`system-instruction-${agent.name}`}
              aria-label={`System Instruction for ${agent.name}`}
              className="h-24 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
          
        </fieldset>

        <fieldset className="mt-6">
          <legend className="sr-only">MCP Servers for {agent.name}</legend>
          <div className="mt-2">
            <h4 className="text-lg font-semibold mb-2" id={`mcp-servers-${agent.name}`}>MCP Servers</h4>
            <ul className="space-y-2" aria-labelledby={`mcp-servers-${agent.name}`}>
              {mcpServers.map((server, index) => (
                <li key={index} className="flex justify-between items-center p-2 bg-base-200 rounded">
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-base-content/70">{server.serverUrl}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm focus-visible:ring-2 focus-visible:ring-error focus-visible:outline-none text-error hover:bg-error/10"
                    aria-label={`Remove MCP server ${server.name}`}
                    onClick={() => handleRemoveMcpServer(index)}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Server Name"
              aria-label={`New MCP Server Name for ${agent.name}`}
              value={newMcpServer.name}
              onChange={(e) => setNewMcpServer({...newMcpServer, name: e.target.value})}
              size="sm"
              className="flex-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            />
            <Input
              placeholder="Server URL"
              aria-label={`New MCP Server URL for ${agent.name}`}
              value={newMcpServer.serverUrl}
              onChange={(e) => setNewMcpServer({...newMcpServer, serverUrl: e.target.value})}
              size="sm"
              className="flex-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
          
        </fieldset>

        <fieldset className="mt-6">
          <legend className="sr-only">MCP Tool Usage Guard for {agent.name}</legend>
          <div className="mt-2">
            <h4 className="text-lg font-semibold mb-2">MCP Tool Usage Guard</h4>
            <div className="form-control">
              <label className="label cursor-pointer" htmlFor={`enable-mcp-guard-${agent.name}`}>
                <span className="label-text">Enable MCP Tool Usage Guard</span>
                <Toggle
                  id={`enable-mcp-guard-${agent.name}`}
                  aria-label={`Enable MCP Tool Usage Guard for ${agent.name}`}
                  className="toggle toggle-primary"
                  checked={mcpGuard.enabled}
                  onChange={(e) => handleMcpGuardChange('enabled', e.target.checked)}
                />
              </label>
            </div>
            
            {mcpGuard.enabled && (
              <div className="mt-4">
                <div className="form-control w-full">
                  <label className="label" htmlFor={`mcp-guard-type-${agent.name}`}>
                    <span className="label-text">Guard Type</span>
                  </label>
                  <Select
                    id={`mcp-guard-type-${agent.name}`}
                    aria-label={`MCP Guard Type for ${agent.name}`}
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
                    <label className="label" htmlFor={`mcp-guard-users-${agent.name}`}>
                      <span className="label-text">Allowed User IDs (comma-separated)</span>
                    </label>
                    <Textarea
                      id={`mcp-guard-users-${agent.name}`}
                      aria-label={`Allowed User IDs for ${agent.name}`}
                      className="h-16 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      value={mcpGuard.allowedUserIds?.join(', ') || ''}
                      onChange={(e) => handleMcpGuardChange('allowedUserIds', e.target.value.split(',').map(id => id.trim()))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </fieldset>
      </Card.Body>
    </Card>
  );
};

// ⚡ Bolt Optimization: Added memo() to prevent unnecessary re-renders in grid lists
AgentCard.displayName = 'AgentCard';

export default memo(AgentCard);
