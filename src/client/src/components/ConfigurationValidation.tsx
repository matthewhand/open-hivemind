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
        suggestion: 'Provide a unique name for the bot'
      });
    }

    if (!botConfig.messageProvider) {
      results.push({
        type: 'error',
        category: 'Basic Configuration',
        message: 'Message provider is required',
        field: 'messageProvider',
        suggestion: 'Select a message provider (Discord, Slack, or Mattermost)'
      });
    }

    if (!botConfig.llmProvider) {
      results.push({
        type: 'error',
        category: 'Basic Configuration',
        message: 'LLM provider is required',
        field: 'llmProvider',
        suggestion: 'Select an LLM provider (OpenAI, Flowise, etc.)'
      });
    }

    // Provider-specific validation
    if (botConfig.messageProvider === 'discord' && !botConfig.discord?.token) {
      results.push({
        type: 'warning',
        category: 'Discord Configuration',
        message: 'Discord bot token not configured',
        field: 'discord.token',
        suggestion: 'Set DISCORD_BOT_TOKEN environment variable or configure in bot settings'
      });
    }

    if (botConfig.messageProvider === 'slack' && (!botConfig.slack?.botToken || !botConfig.slack?.appToken)) {
      results.push({
        type: 'warning',
        category: 'Slack Configuration',
        message: 'Slack tokens not fully configured',
        field: 'slack',
        suggestion: 'Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN environment variables'
      });
    }

    if (botConfig.llmProvider === 'openai' && !botConfig.openai?.apiKey) {
      results.push({
        type: 'warning',
        category: 'OpenAI Configuration',
        message: 'OpenAI API key not configured',
        field: 'openai.apiKey',
        suggestion: 'Set OPENAI_API_KEY environment variable'
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
          suggestion: 'Consider shortening the system instruction to improve response times'
        });
      }

      if (botConfig.systemInstruction.length < 10) {
        results.push({
          type: 'info',
          category: 'System Instruction',
          message: 'System instruction is very short',
          field: 'systemInstruction',
          suggestion: 'Consider adding more detailed instructions for better bot behavior'
        });
      }
    }

    // Success message if no errors
    if (results.length === 0) {
      results.push({
        type: 'success',
        category: 'Overall Validation',
        message: 'Configuration appears to be valid',
        suggestion: 'No issues detected in the current configuration'
      });
    }

    setValidationResults(results);
    setLoading(false);
  };

  const getValidationIcon = (type: string) => {
    const className = "w-5 h-5";
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
    if (getSeverityCount('error') > 0) return 'error';
    if (getSeverityCount('warning') > 0) return 'warning';
    if (getSeverityCount('success') > 0) return 'success';
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
      status: bot.name ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <XCircleIcon className="w-5 h-5 text-error" />
    },
    {
      property: 'Message Provider',
      value: bot.messageProvider || 'Not set',
      status: bot.messageProvider ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <XCircleIcon className="w-5 h-5 text-error" />
    },
    {
      property: 'LLM Provider',
      value: bot.llmProvider || 'Not set',
      status: bot.llmProvider ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <XCircleIcon className="w-5 h-5 text-error" />
    },
    {
      property: 'Persona',
      value: bot.persona || 'None',
      status: <CheckCircleIcon className="w-5 h-5 text-success" />
    },
    {
      property: 'System Instruction',
      value: bot.systemInstruction ? `${bot.systemInstruction.substring(0, 50)}...` : 'Not set',
      status: bot.systemInstruction ? <CheckCircleIcon className="w-5 h-5 text-success" /> : <ExclamationTriangleIcon className="w-5 h-5 text-warning" />
    },
    {
      property: 'MCP Servers',
      value: `${bot.mcpServers ? (Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1) : 0} configured`,
      status: <CheckCircleIcon className="w-5 h-5 text-success" />
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
          {loading ? <Loading size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
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
      <Accordion defaultOpen={false}>
        <Accordion.Item value="overview">
          <Accordion.Trigger>Configuration Overview</Accordion.Trigger>
          <Accordion.Content>
            <DataTable columns={configTableColumns} data={configTableData} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
};

export default ConfigurationValidation;