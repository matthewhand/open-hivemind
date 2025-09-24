import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
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
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="action" />;
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
        <CardContent>
          <Typography variant="h6" color="text.secondary">
            Select a bot to validate its configuration
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <VerifiedIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Configuration Validation - {bot.name}
            </Typography>
            <Button
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={() => validateConfiguration(bot)}
              disabled={loading}
            >
              Re-validate
            </Button>
          </Box>

          {/* Overall Status */}
          <Alert
            severity={overallStatus === 'success' ? 'success' : overallStatus === 'warning' ? 'warning' : overallStatus === 'error' ? 'error' : 'info'}
            sx={{ mb: 3 }}
            icon={getValidationIcon(overallStatus)}
          >
            {overallStatus === 'success' && 'Configuration is valid with no issues detected.'}
            {overallStatus === 'warning' && 'Configuration has some warnings that should be addressed.'}
            {overallStatus === 'error' && 'Configuration has errors that must be fixed.'}
            {overallStatus === 'info' && 'Configuration validation completed.'}
          </Alert>

          {/* Summary Statistics */}
          <Box display="flex" gap={2} mb={3}>
            <Chip
              label={`${getSeverityCount('error')} Errors`}
              color="error"
              size="small"
              icon={<ErrorIcon />}
            />
            <Chip
              label={`${getSeverityCount('warning')} Warnings`}
              color="warning"
              size="small"
              icon={<WarningIcon />}
            />
            <Chip
              label={`${getSeverityCount('info')} Info`}
              color="info"
              size="small"
              icon={<InfoIcon />}
            />
            <Chip
              label={`${getSeverityCount('success')} Success`}
              color="success"
              size="small"
              icon={<CheckCircleIcon />}
            />
          </Box>

          {/* Validation Results */}
          <List>
            {validationResults.map((result, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>
                    {getValidationIcon(result.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">
                          {result.category}
                        </Typography>
                        <Chip
                          label={result.type}
                          size="small"
                          color={result.type === 'error' ? 'error' : result.type === 'warning' ? 'warning' : result.type === 'success' ? 'success' : 'info'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {result.message}
                        </Typography>
                        {result.field && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            Field: {result.field}
                          </Typography>
                        )}
                        {result.suggestion && (
                          <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                            Suggestion: {result.suggestion}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < validationResults.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {validationResults.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No validation results available. Click "Re-validate" to check the configuration.
              </Typography>
            </Box>
          )}

          {/* Configuration Overview */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Configuration Overview</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Property</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Bot Name</TableCell>
                      <TableCell>{bot.name || 'Not set'}</TableCell>
                      <TableCell>
                        {bot.name ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Message Provider</TableCell>
                      <TableCell>{bot.messageProvider || 'Not set'}</TableCell>
                      <TableCell>
                        {bot.messageProvider ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>LLM Provider</TableCell>
                      <TableCell>{bot.llmProvider || 'Not set'}</TableCell>
                      <TableCell>
                        {bot.llmProvider ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Persona</TableCell>
                      <TableCell>{bot.persona || 'None'}</TableCell>
                      <TableCell>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>System Instruction</TableCell>
                      <TableCell>
                        {bot.systemInstruction
                          ? `${bot.systemInstruction.substring(0, 50)}...`
                          : 'Not set'
                        }
                      </TableCell>
                      <TableCell>
                        {bot.systemInstruction ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>MCP Servers</TableCell>
                      <TableCell>
                        {bot.mcpServers
                          ? (Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1)
                          : 0
                        } configured
                      </TableCell>
                      <TableCell>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

    </>
  );
};

export default ConfigurationValidation;