/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, DataTable, Accordion, Divider, Loading } from './DaisyUI';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import type { Bot } from '../services/api';

interface ConfigurationValidationProps {
  bot: Bot | null;
  onRefresh?: () => void;
}

interface ValidationResult {
  type: 'error' | 'warning' | 'info' | 'success';
  category: string;
  message: string;
  field?: string;
  suggestion?: string;
}

const ConfigurationValidation: React.FC<ConfigurationValidationProps> = ({ bot }) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizeMcpServers = (servers: Bot['mcpServers']) => {
    if (!servers) return [];
    return (Array.isArray(servers) ? servers : [servers]).map((server) => {
      if (typeof server === 'string') {
        return { name: server, serverUrl: undefined };
      }
      return { name: server.name, serverUrl: server.serverUrl };
    });
  };

  useEffect(() => {
    if (bot) {
      validateConfiguration(bot);
    } else {
      setValidationResults([]);
    }
  }, [bot]);

  const validateConfiguration = (botConfig: Bot) => {
    setLoading(true);
    const results: ValidationResult[] = [];

    // Basic validation
    if (!botConfig.name) {
      results.push({
        type: 'error',
        category: 'Basic Configuration',
        message: 'Bot name is required',
        field: 'name',
        suggestion: 'Provide a unique name for the bot',
      });
    }

    if (!botConfig.messageProvider) {
      results.push({
        type: 'error',
        category: 'Basic Configuration',
        message: 'Message provider is required',
        field: 'messageProvider',
        suggestion: 'Select a message provider (Discord, Slack, or Mattermost)',
      });
    }

    if (!botConfig.llmProvider) {
      results.push({
        type: 'error',
        category: 'Basic Configuration',
        message: 'LLM provider is required',
        field: 'llmProvider',
        suggestion: 'Select an LLM provider (OpenAI, Flowise, etc.)',
      });
    }

    const validMessageProviders = ['discord', 'slack', 'mattermost'];
    if (botConfig.messageProvider && !validMessageProviders.includes(botConfig.messageProvider)) {
      results.push({
        type: 'warning',
        category: 'Basic Configuration',
        message: `Unknown message provider "${botConfig.messageProvider}"`,
        field: 'messageProvider',
        suggestion: 'Confirm the provider is supported or update to a valid provider.',
      });
    }

    const validLlmProviders = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];
    if (botConfig.llmProvider && !validLlmProviders.includes(botConfig.llmProvider)) {
      results.push({
        type: 'warning',
        category: 'Basic Configuration',
        message: `Unknown LLM provider "${botConfig.llmProvider}"`,
        field: 'llmProvider',
        suggestion: 'Confirm the provider is supported or update to a valid provider.',
      });
    }

    // Provider-specific validation
    if (botConfig.messageProvider === 'discord' && !botConfig.discord?.token) {
      results.push({
        type: 'warning',
        category: 'Discord Configuration',
        message: 'Discord bot token not configured',
        field: 'discord.token',
        suggestion: 'Set DISCORD_BOT_TOKEN environment variable or configure in bot settings',
      });
    }

    if (botConfig.messageProvider === 'slack' && (!botConfig.slack?.botToken || !botConfig.slack?.appToken)) {
      results.push({
        type: 'warning',
        category: 'Slack Configuration',
        message: 'Slack tokens not fully configured',
        field: 'slack',
        suggestion: 'Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN environment variables',
      });
    }

    if (botConfig.messageProvider === 'mattermost' && (!botConfig.mattermost?.url || !botConfig.mattermost?.accessToken)) {
      results.push({
        type: 'warning',
        category: 'Mattermost Configuration',
        message: 'Mattermost URL or access token missing',
        field: 'mattermost',
        suggestion: 'Set MATTERMOST_URL and MATTERMOST_ACCESS_TOKEN environment variables',
      });
    }

    if (botConfig.llmProvider === 'openai' && !botConfig.openai?.apiKey) {
      results.push({
        type: 'warning',
        category: 'OpenAI Configuration',
        message: 'OpenAI API key not configured',
        field: 'openai.apiKey',
        suggestion: 'Set OPENAI_API_KEY environment variable',
      });
    }

    if (botConfig.llmProvider === 'openai' && !botConfig.openai?.model) {
      results.push({
        type: 'info',
        category: 'OpenAI Configuration',
        message: 'OpenAI model not specified',
        field: 'openai.model',
        suggestion: 'Select a model (e.g. gpt-4o-mini) to ensure deterministic behavior.',
      });
    }

    if (botConfig.llmProvider === 'flowise' && (!botConfig.flowise?.apiUrl || !botConfig.flowise?.chatflowId)) {
      results.push({
        type: 'warning',
        category: 'Flowise Configuration',
        message: 'Flowise API URL or chatflow ID missing',
        field: 'flowise',
        suggestion: 'Set FLOWISE_API_URL and FLOWISE_CHATFLOW_ID.',
      });
    }

    if (botConfig.llmProvider === 'openwebui' && (!botConfig.openwebui?.apiUrl || !botConfig.openwebui?.model)) {
      results.push({
        type: 'warning',
        category: 'OpenWebUI Configuration',
        message: 'OpenWebUI API URL or model missing',
        field: 'openwebui',
        suggestion: 'Set OPENWEBUI_API_URL and OPENWEBUI_MODEL.',
      });
    }

    if (botConfig.llmProvider === 'openswarm' && (!botConfig.openswarm?.apiUrl || !botConfig.openswarm?.swarmId)) {
      results.push({
        type: 'warning',
        category: 'OpenSwarm Configuration',
        message: 'OpenSwarm API URL or swarm ID missing',
        field: 'openswarm',
        suggestion: 'Set OPENSWARM_API_URL and OPENSWARM_SWARM_ID.',
      });
    }

    if (botConfig.llmProvider === 'perplexity' && !botConfig.perplexity?.apiKey) {
      results.push({
        type: 'warning',
        category: 'Perplexity Configuration',
        message: 'Perplexity API key not configured',
        field: 'perplexity.apiKey',
        suggestion: 'Set PERPLEXITY_API_KEY environment variable.',
      });
    }

    if (botConfig.llmProvider === 'replicate' && (!botConfig.replicate?.apiKey || !botConfig.replicate?.model)) {
      results.push({
        type: 'warning',
        category: 'Replicate Configuration',
        message: 'Replicate API key or model not configured',
        field: 'replicate',
        suggestion: 'Set REPLICATE_API_KEY and REPLICATE_MODEL.',
      });
    }

    if (botConfig.llmProvider === 'n8n' && (!botConfig.n8n?.apiUrl || !botConfig.n8n?.workflowId)) {
      results.push({
        type: 'warning',
        category: 'n8n Configuration',
        message: 'n8n API URL or workflow ID missing',
        field: 'n8n',
        suggestion: 'Set N8N_API_URL and N8N_WORKFLOW_ID.',
      });
    }

    // System instruction validation
    if (botConfig.systemInstruction) {
      if (botConfig.systemInstruction.length > 2000) {
        results.push({
          type: 'warning',
          category: 'System Instruction',
          message: 'System instruction is very long',
          field: 'systemInstruction',
          suggestion: 'Consider shortening the system instruction to improve response times',
        });
      }

      if (botConfig.systemInstruction.length < 10) {
        results.push({
          type: 'info',
          category: 'System Instruction',
          message: 'System instruction is very short',
          field: 'systemInstruction',
          suggestion: 'Consider adding more detailed instructions for better bot behavior',
        });
      }
    } else {
      results.push({
        type: 'info',
        category: 'System Instruction',
        message: 'System instruction is not set',
        field: 'systemInstruction',
        suggestion: 'Add a system instruction to guide tone, safety, and response style.',
      });
    }

    const mcpServers = normalizeMcpServers(botConfig.mcpServers);
    const mcpMissingUrl = mcpServers.filter((server) => !server.serverUrl && server.name);
    if (mcpServers.length > 0 && mcpMissingUrl.length > 0) {
      results.push({
        type: 'warning',
        category: 'MCP Configuration',
        message: `${mcpMissingUrl.length} MCP server(s) missing a server URL`,
        field: 'mcpServers',
        suggestion: 'Ensure each MCP server has a valid URL configured.',
      });
    }

    // Success message if no errors
    if (results.length === 0) {
      results.push({
        type: 'success',
        category: 'Overall Validation',
        message: 'Configuration appears to be valid',
        suggestion: 'No issues detected in the current configuration',
      });
    }

    const severityOrder: Record<ValidationResult['type'], number> = {
      error: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    results.sort((a, b) => {
      const severityDelta = severityOrder[a.type] - severityOrder[b.type];
      if (severityDelta !== 0) return severityDelta;
      return a.category.localeCompare(b.category);
    });

    setValidationResults(results);
    setLoading(false);
  };

  const getValidationIcon = (type: string) => {
    const className = 'w-5 h-5';
    switch (type) {
    case 'success':
      return <CheckCircleIcon className={`${className} text-success`} />;
    case 'error':
      return <XCircleIcon className={`${className} text-error`} />;
    case 'warning':
      return <ExclamationTriangleIcon className={`${className} text-warning`} />;
    case 'info':
      return <InformationCircleIcon className={`${className} text-info`} />;
    default:
      return <InformationCircleIcon className={`${className} text-base-content/50`} />;
    }
  };

  const getSeverityCount = (severity: string) => {
    return validationResults.filter(result => result.type === severity).length;
  };

  const getOverallStatus = () => {
    if (getSeverityCount('error') > 0) {return 'error';}
    if (getSeverityCount('warning') > 0) {return 'warning';}
    if (getSeverityCount('success') > 0) {return 'success';}
    return 'info';
  };

  const overallStatus = getOverallStatus();

  if (!bot) {
    return (
      <Card>
        <h2 className="text-lg text-base-content/70 text-center">
          Select a bot to validate its configuration
        </h2>
      </Card>
    );
  }

  const configTableColumns = [
    { key: 'property', label: 'Property' },
    { key: 'value', label: 'Value' },
    { key: 'status', label: 'Status' },
  ];

  const configTableData = [
    {
      property: 'Bot Name',
      value: bot.name || 'Not set',
      status: bot.name ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <XCircleIcon className="w-5 h-5 text-error" />,
    },
    {
      property: 'Message Provider',
      value: bot.messageProvider || 'Not set',
      status: bot.messageProvider ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <XCircleIcon className="w-5 h-5 text-error" />,
    },
    {
      property: 'LLM Provider',
      value: bot.llmProvider || 'Not set',
      status: bot.llmProvider ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <XCircleIcon className="w-5 h-5 text-error" />,
    },
    {
      property: 'Persona',
      value: bot.persona || 'None',
      status: <CheckCircleIcon className="w-5 h-5 text-success" />,
    },
    {
      property: 'System Instruction',
      value: bot.systemInstruction ? `${bot.systemInstruction.substring(0, 50)}...` : 'Not set',
      status: bot.systemInstruction ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <ExclamationTriangleIcon className="w-5 h-5 text-warning" />,
    },
    {
      property: 'MCP Servers',
      value: (() => {
        const servers = normalizeMcpServers(bot.mcpServers);
        const missing = servers.filter((server) => !server.serverUrl && server.name);
        const missingSuffix = missing.length > 0 ? ` (${missing.length} missing URL)` : '';
        return `${servers.length} configured${missingSuffix}`;
      })(),
      status: <CheckCircleIcon className="w-5 h-5 text-success" />,
    },
  ];

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-6 h-6" />
          <h2 className="text-lg font-semibold">Configuration Validation - {bot.name}</h2>
        </div>
        <Button
          size="sm"
          onClick={() => validateConfiguration(bot)}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? <span className="loading loading-spinner loading-sm"></span> : <ArrowPathIcon className="w-4 h-4" />}
          Re-validate
        </Button>
      </div>

      {/* Overall Status */}
      <Alert
        status={overallStatus as any}
        message={
          overallStatus === 'success' ? 'Configuration is valid with no issues detected.' :
            overallStatus === 'warning' ? 'Configuration has some warnings that should be addressed.' :
              overallStatus === 'error' ? 'Configuration has errors that must be fixed.' :
                'Configuration validation completed.'
        }
        className="mb-6"
      />

      {/* Summary Statistics */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant="error" size="md">
          {getValidationIcon('error')}
          {getSeverityCount('error')} Errors
        </Badge>
        <Badge variant="warning" size="md">
          {getValidationIcon('warning')}
          {getSeverityCount('warning')} Warnings
        </Badge>
        <Badge variant="neutral" size="md">
          {getValidationIcon('info')}
          {getSeverityCount('info')} Info
        </Badge>
        <Badge variant="success" size="md">
          {getValidationIcon('success')}
          {getSeverityCount('success')} Success
        </Badge>
      </div>

      {/* Validation Results */}
      <div className="space-y-2 mb-6">
        {validationResults.map((result, index) => (
          <div key={index} className="flex gap-3 p-3 bg-base-200 rounded-box">
            <div className="flex-shrink-0 pt-1">{getValidationIcon(result.type)}</div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{result.category}</span>
                <Badge
                  variant={
                    result.type === 'error' ? 'error' :
                      result.type === 'warning' ? 'warning' :
                        result.type === 'success' ? 'success' : 'neutral'
                  }
                  size="sm"
                >
                  {result.type}
                </Badge>
              </div>
              <p className="text-sm text-base-content/70 mb-1">{result.message}</p>
              {result.field && (
                <p className="text-xs text-base-content/60">Field: {result.field}</p>
              )}
              {result.suggestion && (
                <p className="text-xs text-primary mt-1">💡 {result.suggestion}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {validationResults.length === 0 && !loading && (
        <div className="text-center py-8 text-base-content/70">
          No validation results available. Click "Re-validate" to check the configuration.
        </div>
      )}

      {/* Configuration Overview */}
      <Accordion
        items={[{
          id: "overview",
          title: "Configuration Overview",
          content: <DataTable columns={configTableColumns} data={configTableData} />
        }]}
      />
    </Card>
  );
};

export default ConfigurationValidation;
