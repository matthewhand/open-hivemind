import React, { useState, useEffect } from 'react';
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

const ConfigurationValidation: React.FC<ConfigurationValidationProps> = ({
  bot
}) => {
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

    // MCP Server validation
    if (botConfig.mcpServers) {
      const servers = Array.isArray(botConfig.mcpServers) ? botConfig.mcpServers : [botConfig.mcpServers];
      servers.forEach((server, index) => {
        if (typeof server === 'string') {
          try {
            new URL(server);
          } catch {
            results.push({
              type: 'error',
              category: 'MCP Server Configuration',
              message: `Invalid URL format for MCP server ${index + 1}`,
              field: `mcpServers[${index}]`,
              suggestion: 'Ensure MCP server URLs are valid HTTP/HTTPS URLs'
            });
          }
        }
      });
    }

    // Persona validation
    if (botConfig.persona) {
      const validPersonas = ['dev-assistant', 'friendly-helper', 'teacher'];
      if (!validPersonas.includes(botConfig.persona)) {
        results.push({
          type: 'warning',
          category: 'Persona Configuration',
          message: 'Custom persona detected',
          field: 'persona',
          suggestion: 'Custom personas may not have predefined behavior patterns'
        });
      }
    }

    // MCP Guard validation
    if (botConfig.mcpGuard?.enabled) {
      if (botConfig.mcpGuard.type === 'custom' && !botConfig.mcpGuard.allowedUserIds?.length) {
        results.push({
          type: 'warning',
          category: 'MCP Guard Configuration',
          message: 'MCP Guard enabled but no allowed users specified',
          field: 'mcpGuard.allowedUserIds',
          suggestion: 'Add user IDs to the allowed list or consider using owner-only mode'
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
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <p className="text-base-content/60">
            Select a bot to validate its configuration
          </p>
        </div>
      </div>
    );
  }

  const statusMessage = overallStatus === 'success' 
    ? 'Configuration is valid with no issues detected.'
    : overallStatus === 'warning' 
    ? 'Configuration has some warnings that should be addressed.'
    : overallStatus === 'error' 
    ? 'Configuration has errors that must be fixed.'
    : 'Configuration validation completed.';

  return (
    <>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title flex items-center gap-2">
              <span className="text-success">✅</span>
              Configuration Validation - {bot.name}
            </h3>
            <button
              className="btn btn-sm"
              onClick={() => validateConfiguration(bot)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Validating...
                </>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Re-validate
                </>
              )}
            </button>
          </div>

          {/* Overall Status */}
          <div className={`alert alert-${overallStatus} shadow-lg mb-4 flex items-center gap-2`}>
            <span className={`text-${overallStatus} text-xl`}>{getValidationIcon(overallStatus)}</span>
            <span>{statusMessage}</span>
          </div>

          {/* Summary Statistics */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="badge badge-error gap-2">
              <span>✗</span>
              {getSeverityCount('error')} Errors
            </div>
            <div className="badge badge-warning gap-2">
              <span>⚠️</span>
              {getSeverityCount('warning')} Warnings
            </div>
            <div className="badge badge-info gap-2">
              <span>ℹ️</span>
              {getSeverityCount('info')} Info
            </div>
            <div className="badge badge-success gap-2">
              <span>✓</span>
              {getSeverityCount('success')} Success
            </div>
          </div>

          {/* Validation Results */}
          <div className="space-y-2">
            {validationResults.map((result, index) => (
              <React.Fragment key={index}>
                <div className="flex items-start gap-3 p-4 bg-base-100 rounded-lg border border-base-200">
                  <span className={`text-${result.type} text-xl mt-0.5 flex-shrink-0`}>{getValidationIcon(result.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-base-content">{result.category}</h4>
                      <div className={`badge badge-${result.type}`}>{result.type}</div>
                    </div>
                    <p className="text-sm text-base-content/80 mb-1">{result.message}</p>
                    {result.field && (
                      <p className="text-xs text-base-content/60">Field: {result.field}</p>
                    )}
                    {result.suggestion && (
                      <p className="text-xs text-primary mt-1">Suggestion: {result.suggestion}</p>
                    )}
                  </div>
                </div>
                {index < validationResults.length - 1 && <div className="divider"></div>}
              </React.Fragment>
            ))}
          </div>

          {validationResults.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-base-content/60 text-lg">
                No validation results available. Click "Re-validate" to check the configuration.
              </p>
            </div>
          )}

          {/* Configuration Overview */}
          <div className="collapse collapse-arrow mt-6">
            <input type="checkbox" />
            <div className="collapse-title text-lg font-medium">Configuration Overview</div>
            <div className="collapse-content">
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Bot Name</td>
                      <td>{bot.name || 'Not set'}</td>
                      <td>{bot.name ? <span className="text-success">✓</span> : <span className="text-error">✗</span>}</td>
                    </tr>
                    <tr>
                      <td>Message Provider</td>
                      <td>{bot.messageProvider || 'Not set'}</td>
                      <td>{bot.messageProvider ? <span className="text-success">✓</span> : <span className="text-error">✗</span>}</td>
                    </tr>
                    <tr>
                      <td>LLM Provider</td>
                      <td>{bot.llmProvider || 'Not set'}</td>
                      <td>{bot.llmProvider ? <span className="text-success">✓</span> : <span className="text-error">✗</span>}</td>
                    </tr>
                    <tr>
                      <td>Persona</td>
                      <td>{bot.persona || 'None'}</td>
                      <td><span className="text-success">✓</span></td>
                    </tr>
                    <tr>
                      <td>System Instruction</td>
                      <td>
                        {bot.systemInstruction
                          ? `${bot.systemInstruction.substring(0, 50)}...`
                          : 'Not set'
                        }
                      </td>
                      <td>{bot.systemInstruction ? <span className="text-success">✓</span> : <span className="text-warning">⚠️</span>}</td>
                    </tr>
                    <tr>
                      <td>MCP Servers</td>
                      <td>
                        {bot.mcpServers
                          ? (Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1)
                          : 0
                        } configured
                      </td>
                      <td><span className="text-success">✓</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfigurationValidation;