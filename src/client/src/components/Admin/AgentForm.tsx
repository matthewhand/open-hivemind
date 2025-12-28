/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import type { FormField, FormFieldSet } from '../DaisyUI/Form';
import { Form } from '../DaisyUI/Form';

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

interface AgentFormProps {
  agent?: Agent | null;
  messageProviders: Provider[];
  llmProviders: Provider[];
  personas: Persona[];
  mcpServers: MCPServer[];
  onSubmit: (data: Partial<Agent>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const AgentForm: React.FC<AgentFormProps> = ({
  agent,
  messageProviders,
  llmProviders,
  personas,
  mcpServers,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_guardUserInput, _setGuardUserInput] = useState(
    agent?.mcpGuard?.allowedUserIds?.join(', ') || '',
  );

  const formFields: FormField[] = [
    {
      name: 'name',
      label: 'Agent Name',
      type: 'text',
      required: true,
      placeholder: 'Enter agent name',
      helperText: 'Choose a unique name for this agent',
    },
    {
      name: 'messageProvider',
      label: 'Message Provider',
      type: 'select',
      required: true,
      options: [
        { value: '', label: 'Select a message provider', disabled: true },
        ...messageProviders.map(provider => ({
          value: provider.id,
          label: `${provider.name} - ${provider.description}`,
        })),
      ],
      helperText: 'Select the messaging platform this agent will use',
    },
    {
      name: 'llmProvider',
      label: 'LLM Provider',
      type: 'select',
      required: true,
      options: [
        { value: '', label: 'Select an LLM provider', disabled: true },
        ...llmProviders.map(provider => ({
          value: provider.id,
          label: `${provider.name} - ${provider.description}`,
        })),
      ],
      helperText: 'Select the language model provider this agent will use',
    },
    {
      name: 'persona',
      label: 'Persona',
      type: 'select',
      options: [
        { value: 'default', label: 'Default Persona' },
        ...personas.map(persona => ({
          value: persona.key,
          label: persona.name,
        })),
      ],
      helperText: 'Select a persona for this agent',
    },
    {
      name: 'systemInstruction',
      label: 'Custom System Instruction',
      type: 'textarea',
      placeholder: 'Override or extend the persona\'s system prompt',
      helperText: 'Optional custom system instructions for this agent',
      maxLength: 2000,
    },
    {
      name: 'mcpServers',
      label: 'MCP Servers',
      type: 'select',
      multiple: true,
      options: mcpServers.map(server => ({
        value: server.name,
        label: `${server.name} ${server.connected ? '(Connected)' : '(Not Connected)'}`,
        disabled: !server.connected,
      })),
      helperText: 'Select MCP servers to make available to this agent',
    },
    {
      name: 'mcpGuardEnabled',
      label: 'Enable MCP Tool Guard',
      type: 'checkbox',
      helperText: 'Restrict access to MCP tools',
    },
    {
      name: 'mcpGuardType',
      label: 'Guard Type',
      type: 'select',
      options: [
        { value: 'owner', label: 'Message Server Owner Only' },
        { value: 'custom', label: 'Custom User List' },
      ],
      helperText: 'Select how MCP tool access should be restricted (only used when guard is enabled)',
    },
    {
      name: 'allowedUserIds',
      label: 'Allowed User IDs',
      type: 'textarea',
      placeholder: 'user1, user2, user3',
      helperText: 'Comma-separated list of user IDs allowed to use MCP tools (only used with Custom guard type)',
      validation: (value: string) => {
        if (!value) { return null; }
        const ids = value.split(',').map((id: string) => id.trim()).filter((id: string) => id);
        if (ids.length === 0) {
          return null; // Empty is valid
        }
        for (const id of ids) {
          if (!/^[\w-]+$/.test(id)) {
            return 'User IDs must contain only letters, numbers, hyphens, and underscores';
          }
        }
        return null;
      },
    },
    {
      name: 'isActive',
      label: 'Activate agent immediately',
      type: 'checkbox',
      helperText: 'Enable this agent upon creation',
    },
    {
      name: 'envOverrides',
      label: 'Custom Overrides',
      type: 'key-value' as any, // Custom type
      helperText: 'Add key-value pairs to override global settings for this agent',
    },
  ];

  const fieldSets: FormFieldSet[] = [
    {
      legend: 'Basic Information',
      description: 'Configure the basic settings for your agent',
      fields: ['name', 'messageProvider', 'llmProvider', 'persona'],
    },
    {
      legend: 'Behavior & Tools',
      description: 'Customize agent behavior and tool access',
      fields: ['systemInstruction', 'mcpServers', 'isActive'],
    },
    {
      legend: 'MCP Security Guard',
      description: 'Configure guardrails for MCP tool usage.',
      fields: ['mcpGuardEnabled', 'mcpGuardType', 'allowedUserIds'],
    },
    {
      legend: 'Environment Overrides',
      description: 'Override global settings for this agent (e.g., MESSAGE_MIN_DELAY)',
      fields: ['envOverrides'],
    },
  ];

  const transformFormData = (formData: Record<string, any>): Partial<Agent> => {
    const { mcpGuardEnabled, mcpGuardType, allowedUserIds, envOverrides, ...restData } = formData;

    return {
      ...restData,
      ...envOverrides, // Merge overrides into at root level
      mcpGuard: {
        enabled: mcpGuardEnabled || false,
        type: mcpGuardType || 'owner',
        allowedUserIds: allowedUserIds ?
          allowedUserIds.split(',').map((id: string) => id.trim()).filter((id: string) => id)
          : [],
      },
    };
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    const agentData = transformFormData(formData);
    await onSubmit(agentData);
  };

  const knownKeys = new Set(formFields.map(f => f.name).concat(['mcpGuard', 'isActive', 'envOverrides']));

  const initialData = agent ? {
    ...agent,
    mcpGuardEnabled: agent.mcpGuard?.enabled || false,
    mcpGuardType: agent.mcpGuard?.type || 'owner',
    allowedUserIds: agent.mcpGuard?.allowedUserIds?.join(', ') || '',
    envOverrides: Object.entries(agent)
      .filter(([key]) => !knownKeys.has(key))
      .reduce((acc, [key, val]) => ({ ...acc, [key]: String(val) }), {}),
  } : {
    name: '',
    messageProvider: '',
    llmProvider: '',
    persona: 'default',
    systemInstruction: '',
    mcpServers: [],
    mcpGuardEnabled: false,
    mcpGuardType: 'owner',
    allowedUserIds: '',
    isActive: true,
    envOverrides: {},
  };

  return (
    <Form
      fields={formFields}
      onSubmit={handleSubmit}
      initialData={initialData}
      title={agent ? 'Edit Agent' : 'Create New Agent'}
      description={`${agent ? 'Update' : 'Configure'} the settings for your agent`}
      showCancel={true}
      onCancel={onCancel}
      loading={loading}
      submitText={agent ? 'Update Agent' : 'Create Agent'}
      cancelText="Cancel"
      fieldSets={fieldSets}
      layout="vertical"
      size="md"
      validateOnBlur={true}
      className="max-w-4xl mx-auto"
    />
  );
};

export default AgentForm;