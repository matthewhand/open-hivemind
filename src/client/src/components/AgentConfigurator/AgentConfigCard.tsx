import React from 'react';
import type { AgentConfigCardProps, GuardState } from './types';
import type { FieldMetadata } from '../../services/api';
import type { ProviderInfo } from '../../services/providerService';
import Card from '../DaisyUI/Card';
import Divider from '../DaisyUI/Divider';
import Toggle from '../DaisyUI/Toggle';
import { LoadingSpinner } from '../DaisyUI/Loading';
import { Badge } from '../DaisyUI/Badge';
import Input from '../DaisyUI/Input';
import Select from '../DaisyUI/Select';

const AgentConfigCard: React.FC<AgentConfigCardProps> = ({
  bot,
  metadata,
  uiState,
  status,
  pending,
  personaOptions,
  responseProfileOptions,
  guardrailProfileOptions,
  llmProfileOptions,
  mcpServerProfileOptions,
  messageProviderOptions,
  llmProviderOptions,
  messageProviderInfo,
  llmProviderInfo,
  providersLoading,
  personasLoading,
  availableMcpServers,
  guardOptions,
  guardInput,
  onGuardrailProfileChange,
  onSelectionChange,
  onSystemInstructionBlur,
  onGuardToggle,
  onGuardTypeChange,
  onGuardUsersChange,
  onGuardUsersBlur,
}) => {
  const messageConfigured = Boolean(uiState?.messageProvider);
  const llmConfigured = Boolean(uiState?.llmProvider);
  const fullyConfigured = messageConfigured && llmConfigured;
  const connection = connectionStatusLabel(status?.connected, status?.status);
  const selectedMessageInfo = uiState?.messageProvider ? messageProviderInfo[uiState.messageProvider] : undefined;
  const selectedLlmInfo = uiState?.llmProvider ? llmProviderInfo[uiState.llmProvider] : undefined;
  const guardrailProfileActive = Boolean(uiState?.mcpGuardProfile);

  return (
    <Card className="shadow-xl border border-base-300 h-full">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className={`card-title ${fullyConfigured ? 'text-primary' : 'text-base-content/50 line-through'}`}>
              {bot.name}
            </h2>
            <p className="text-sm text-base-content/70">
              {uiState?.messageProvider || 'No message provider selected'} · {uiState?.llmProvider || 'No LLM selected'}
            </p>
          </div>
          {pending && <LoadingSpinner size="md" />}
        </div>

        {/* Provider Configuration Section */}
        <Card className="bg-base-200 shadow-sm mb-4">
          <Card.Title tag="h3" className="text-lg">Provider Configuration</Card.Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <FieldSelect
                  label="Message Provider"
                  value={uiState?.messageProvider || ''}
                  options={messageProviderOptions}
                  metadata={metadata.messageProvider}
                  disabled={pending || providersLoading}
                  helperContent={renderProviderHelper(selectedMessageInfo)}
                  onChange={(value) => onSelectionChange(bot, 'messageProvider', value)}
                />
                <StatusLine
                  label="Messenger"
                  configured={messageConfigured}
                  detail={messageConfigured ? uiState?.messageProvider || '' : 'Awaiting credentials'}
                />
              </div>
              <div className="form-control">
                <FieldSelect
                  label="LLM Provider"
                  value={uiState?.llmProvider || ''}
                  options={llmProviderOptions}
                  metadata={metadata.llmProvider}
                  disabled={pending || providersLoading}
                  helperContent={renderProviderHelper(selectedLlmInfo)}
                  onChange={(value) => onSelectionChange(bot, 'llmProvider', value)}
                />
                <StatusLine
                  label="LLM"
                  configured={llmConfigured}
                  detail={llmConfigured ? uiState?.llmProvider || '' : 'Awaiting credentials'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="form-control">
                <FieldSelect
                  label="LLM Profile"
                  value={uiState?.llmProfile || ''}
                  options={llmProfileOptions}
                  metadata={metadata.llmProfile}
                  disabled={pending}
                  allowEmpty
                  emptyLabel="System Default"
                  helperContent={(
                    <label className="label">
                      <span className="label-text-alt">Optional template for LLM settings.</span>
                    </label>
                  )}
                  onChange={(value) => onSelectionChange(bot, 'llmProfile', value)}
                />
              </div>
            </div>
        </Card>

        {/* Persona & Instructions Section */}
        <Card className="bg-base-200 shadow-sm mb-4">
          <Card.Title tag="h3" className="text-lg">Persona & Instructions</Card.Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <FieldSelect
                  label="Persona"
                  value={uiState?.persona || ''}
                  options={personaOptions}
                  metadata={metadata.persona}
                  disabled={pending || personasLoading}
                  allowEmpty
                  onChange={(value) => onSelectionChange(bot, 'persona', value)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">System Instruction</span>
                </label>
                <textarea
                  className={`textarea textarea-bordered ${metadata.systemInstruction?.locked ? 'textarea-disabled opacity-60' : ''}`}
                  placeholder="System instruction..."
                  value={uiState?.systemInstruction || ''}
                  onChange={(e) => onSelectionChange(bot, 'systemInstruction', e.target.value, false)}
                  onBlur={() => onSystemInstructionBlur(bot)}
                  disabled={metadata.systemInstruction?.locked || pending}
                  readOnly={metadata.systemInstruction?.locked}
                  rows={3}
                />
                <FieldHelper metadata={metadata.systemInstruction} />
              </div>
            </div>
        </Card>

        {/* Engagement Profile Section */}
        <Card className="bg-base-200 shadow-sm mb-4">
          <Card.Title tag="h3" className="text-lg">Engagement Profile</Card.Title>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <FieldSelect
                  label="Response Profile"
                  value={uiState?.responseProfile || ''}
                  options={responseProfileOptions}
                  metadata={metadata.responseProfile}
                  disabled={pending}
                  allowEmpty
                  onChange={(value) => onSelectionChange(bot, 'responseProfile', value)}
                  helperContent={(
                    <label className="label">
                      <span className="label-text-alt">Uses global messaging settings unless a profile is selected.</span>
                    </label>
                  )}
                />
              </div>
            </div>
        </Card>

        {/* MCP Configuration Section */}
        <Card className="bg-base-200 shadow-sm mb-4">
          <Card.Title tag="h3" className="text-lg">MCP Configuration</Card.Title>

            <div className="form-control mb-4">
              <FieldSelect
                label="MCP Server Profile"
                value={uiState?.mcpServerProfile || ''}
                options={mcpServerProfileOptions.map(option => ({
                  value: option.value,
                  label: option.label,
                }))}
                metadata={metadata.mcpServerProfile}
                disabled={pending}
                allowEmpty
                helperContent={uiState?.mcpServerProfile ? (
                  <label className="label">
                    <span className="label-text-alt">MCP servers are loaded from the selected profile.</span>
                  </label>
                ) : undefined}
                onChange={(value) => onSelectionChange(bot, 'mcpServerProfile', value, true)}
              />
            </div>

            <div className="form-control mb-4">
              <FieldSelect
                label="Guardrail Profile"
                value={uiState?.mcpGuardProfile || ''}
                options={guardrailProfileOptions.map(option => ({
                  value: option.value,
                  label: option.label,
                }))}
                metadata={metadata.mcpGuardProfile}
                disabled={pending}
                allowEmpty
                helperContent={guardrailProfileActive && uiState?.mcpGuardProfile ? (
                  <label className="label">
                    <span className="label-text-alt">Guard settings are driven by the selected profile.</span>
                  </label>
                ) : undefined}
                onChange={(value) => onGuardrailProfileChange(bot, value)}
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">MCP Servers</span>
              </label>
              <select
                className={`select select-bordered ${metadata.mcpServers?.locked ? 'select-disabled opacity-60' : ''}`}
                multiple
                value={uiState?.mcpServers || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  onSelectionChange(bot, 'mcpServers', values);
                }}
                disabled={metadata.mcpServers?.locked || pending}
              >
                {availableMcpServers.map(server => (
                  <option key={server} value={server}>
                    {server}
                  </option>
                ))}
              </select>
              <FieldHelper metadata={metadata.mcpServers} fallback="Select connected MCP servers" />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">MCP Tool Guard</span>
                <Toggle
                  className={`toggle ${uiState?.mcpGuard?.enabled ? 'toggle-primary' : ''}`}
                  checked={uiState?.mcpGuard?.enabled || false}
                  onChange={(e) => onGuardToggle(bot, e.target.checked)}
                  disabled={metadata.mcpGuard?.locked || pending || guardrailProfileActive}
                />
              </label>
              <FieldHelper metadata={metadata.mcpGuard} fallback="Restrict who can trigger MCP tools" />
            </div>

            {uiState?.mcpGuard?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Guard Type</span>
                  </label>
                  <Select
                    className="select-bordered"
                    value={uiState.mcpGuard.type}
                    onChange={(e) => onGuardTypeChange(bot, e.target.value as GuardState['type'])}
                    disabled={metadata.mcpGuard?.locked || pending || guardrailProfileActive}
                  >
                    {guardOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                {uiState.mcpGuard.type === 'custom' && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Allowed User IDs</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="user1, user2"
                      value={guardInput}
                      onChange={(e) => onGuardUsersChange(bot, e.target.value)}
                      onBlur={() => onGuardUsersBlur(bot)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onGuardUsersBlur(bot);
                        }
                      }}
                      disabled={metadata.mcpGuard?.locked || pending || guardrailProfileActive}
                    />
                    <label className="label">
                      <span className="label-text-alt">Comma-separated list of user IDs permitted to invoke MCP tools.</span>
                    </label>
                  </div>
                )}
              </div>
            )}
        </Card>

        {/* Status Section */}
        <Divider />

        <div className="flex items-center gap-2 flex-wrap">
          {connection.icon}
          <span className={`text-sm ${connection.color === 'success' ? 'text-success' : connection.color === 'error' ? 'text-error' : 'text-base-content/70'}`}>
            Connection: {connection.label}
          </span>
          {typeof status?.messageCount === 'number' && (
            <Badge style="outline">Messages: {status.messageCount}</Badge>
          )}
          {typeof status?.errorCount === 'number' && status.errorCount > 0 && (
            <Badge variant="error">Errors: {status.errorCount}</Badge>
          )}
        </div>
    </Card>
  );
};

interface FieldSelectProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  metadata?: FieldMetadata;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  onChange: (value: string) => void;
  helperContent?: React.ReactNode;
}

const FieldSelect: React.FC<FieldSelectProps> = ({
  label,
  value,
  options,
  metadata,
  disabled,
  allowEmpty,
  emptyLabel = '(None)',
  onChange,
  helperContent,
}) => (
  <div className="form-control">
    <label className="label">
      <span className="label-text">{label}</span>
    </label>
    <Select
      className={metadata?.locked ? 'select-disabled opacity-60' : ''}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || metadata?.locked}
      aria-label={label}
      options={[
        ...(allowEmpty ? [{ label: emptyLabel || '', value: '' }] : []),
        ...options,
      ]}
    />
    <FieldHelper metadata={metadata} />
    {helperContent}
  </div>
);

const FieldHelper: React.FC<{ metadata?: FieldMetadata; fallback?: string }> = ({ metadata, fallback }) => {
  if (!metadata) {
    return fallback ? <label className="label"><span className="label-text-alt">{fallback}</span></label> : null;
  }

  if (metadata.locked && metadata.envVar) {
    return (
      <label className="label">
        <span className="label-text-alt text-base-content/70">
          Defined via environment variable {metadata.envVar}
        </span>
      </label>
    );
  }

  if (metadata.source === 'user') {
    return (
      <label className="label">
        <span className="label-text-alt text-base-content/70">
          Stored override persisted from WebUI
        </span>
      </label>
    );
  }

  return fallback ? <label className="label"><span className="label-text-alt">{fallback}</span></label> : null;
};

const StatusLine: React.FC<{ label: string; configured: boolean; detail: string }> = ({
  label,
  configured,
  detail,
}) => (
  <div className="flex items-center gap-2 mt-1">
    <div className={`w-2 h-2 rounded-full ${configured ? 'bg-success' : 'bg-error'}`}></div>
    <span className={`text-xs ${configured ? 'text-success' : 'text-error'}`}>
      {label}: {detail}
    </span>
  </div>
);

const connectionStatusLabel = (
  connected?: boolean,
  statusText?: string,
): { icon: React.ReactNode; color: 'success' | 'default' | 'error'; label: string } => {
  if (connected === true) {
    return {
      icon: <div className="w-2 h-2 rounded-full bg-success"></div>,
      color: 'success',
      label: statusText || 'Connected',
    };
  }
  if (connected === false) {
    return {
      icon: <div className="w-2 h-2 rounded-full bg-error"></div>,
      color: 'error',
      label: statusText || 'Disconnected',
    };
  }
  return {
    icon: <div className="w-2 h-2 rounded-full bg-base-content/30"></div>,
    color: 'default',
    label: statusText || 'Unknown',
  };
};

const renderProviderHelper = (info?: ProviderInfo) => {
  if (!info) { return null; }

  if (!info.docsUrl && !info.helpText) {
    return null;
  }

  return (
    <div className="mt-1">
      {info.helpText && (
        <label className="label">
          <span className="label-text-alt">{info.helpText}</span>
        </label>
      )}
      {info.docsUrl && (
        <label className="label">
          <a
            href={info.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="label-text-alt link link-primary"
          >
            Provider setup guide
          </a>
        </label>
      )}
    </div>
  );
};

export default AgentConfigCard;
