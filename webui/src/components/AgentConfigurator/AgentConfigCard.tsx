import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { AgentConfigCardProps } from './types';
import type { FieldMetadata } from '../../services/api';
import type { ProviderInfo } from '../../services/providerService';

const AgentConfigCard: React.FC<AgentConfigCardProps> = ({
  bot,
  metadata,
  uiState,
  status,
  pending,
  personaOptions,
  messageProviderOptions,
  llmProviderOptions,
  messageProviderInfo,
  llmProviderInfo,
  providersLoading,
  personasLoading,
  availableMcpServers,
  guardOptions,
  guardInput,
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

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
          <Box>
            <Typography
              variant="h6"
              sx={{
                textDecoration: fullyConfigured ? 'none' : 'line-through',
                color: fullyConfigured ? 'text.primary' : 'text.disabled',
                transition: 'color 0.2s ease',
              }}
            >
              {bot.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {uiState?.messageProvider || 'No message provider selected'} · {uiState?.llmProvider || 'No LLM selected'}
            </Typography>
          </Box>
          {pending && <CircularProgress size={20} />}
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FieldSelect
              label="Message Provider"
              value={uiState?.messageProvider || ''}
              options={messageProviderOptions}
              metadata={metadata.messageProvider}
              disabled={pending || providersLoading}
              helperContent={renderProviderHelper(selectedMessageInfo)}
              onChange={(event: SelectChangeEvent<string>) => onSelectionChange(bot, 'messageProvider', event.target.value)}
            />
            <StatusLine
              label="Messenger"
              configured={messageConfigured}
              detail={messageConfigured ? uiState?.messageProvider || '' : 'Awaiting credentials'}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FieldSelect
              label="LLM Provider"
              value={uiState?.llmProvider || ''}
              options={llmProviderOptions}
              metadata={metadata.llmProvider}
              disabled={pending || providersLoading}
              helperContent={renderProviderHelper(selectedLlmInfo)}
              onChange={(event: SelectChangeEvent<string>) => onSelectionChange(bot, 'llmProvider', event.target.value)}
            />
            <StatusLine
              label="LLM"
              configured={llmConfigured}
              detail={llmConfigured ? uiState?.llmProvider || '' : 'Awaiting credentials'}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FieldSelect
              label="Persona"
              value={uiState?.persona || ''}
              options={personaOptions}
              metadata={metadata.persona}
              disabled={pending || personasLoading}
              allowEmpty
              onChange={(event: SelectChangeEvent<string>) => onSelectionChange(bot, 'persona', event.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              disabled={metadata.systemInstruction?.locked || pending}
              sx={{ opacity: metadata.systemInstruction?.locked ? 0.6 : 1 }}
            >
              <TextField
                label="System Instruction"
                value={uiState?.systemInstruction || ''}
                onChange={(event) => onSelectionChange(bot, 'systemInstruction', event.target.value, false)}
                onBlur={() => onSystemInstructionBlur(bot)}
                multiline
                minRows={3}
                InputProps={{
                  readOnly: metadata.systemInstruction?.locked,
                }}
              />
              <FieldHelper metadata={metadata.systemInstruction} />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl
              fullWidth
              disabled={metadata.mcpServers?.locked || pending}
              sx={{ opacity: metadata.mcpServers?.locked ? 0.6 : 1 }}
            >
              <InputLabel>MCP Servers</InputLabel>
              <Select
                label="MCP Servers"
                multiple
                value={uiState?.mcpServers || []}
                onChange={(event) => onSelectionChange(bot, 'mcpServers', event.target.value as string[])}
                renderValue={(selected) => (selected as string[]).join(', ')}
              >
                {availableMcpServers.map(server => (
                  <MenuItem key={server} value={server}>
                    {server}
                  </MenuItem>
                ))}
              </Select>
              <FieldHelper metadata={metadata.mcpServers} fallback="Select connected MCP servers" />
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">MCP Tool Guard</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={uiState?.mcpGuard.enabled || false}
                    onChange={(_, checked) => onGuardToggle(bot, checked)}
                    disabled={metadata.mcpGuard?.locked || pending}
                  />
                }
                label={uiState?.mcpGuard.enabled ? 'Enabled' : 'Disabled'}
              />
            </Box>
            <FieldHelper metadata={metadata.mcpGuard} fallback="Restrict who can trigger MCP tools" />
          </Grid>

          {uiState?.mcpGuard.enabled && (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={metadata.mcpGuard?.locked || pending}>
                  <InputLabel>Guard Type</InputLabel>
                  <Select
                    label="Guard Type"
                    value={uiState.mcpGuard.type}
                    onChange={(event) => onGuardTypeChange(bot, event.target.value as GuardState['type'])}
                  >
                    {guardOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {uiState.mcpGuard.type === 'custom' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={metadata.mcpGuard?.locked || pending}>
                    <TextField
                      label="Allowed User IDs"
                      value={guardInput}
                      placeholder="user1, user2"
                      onChange={(event) => onGuardUsersChange(bot, event.target.value)}
                      onBlur={() => onGuardUsersBlur(bot)}
                    />
                    <FormHelperText>Comma-separated list of user IDs permitted to invoke MCP tools.</FormHelperText>
                  </FormControl>
                </Grid>
              )}
            </>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" alignItems="center" spacing={1}>
          {connection.icon}
          <Typography
            variant="body2"
            color={connection.color === 'success' ? 'success.main' : connection.color === 'error' ? 'error.main' : 'text.secondary'}
          >
            Connection: {connection.label}
          </Typography>
          {typeof status?.messageCount === 'number' && (
            <Chip size="small" label={`Messages: ${status.messageCount}`} variant="outlined" />
          )}
          {typeof status?.errorCount === 'number' && status.errorCount > 0 && (
            <Chip size="small" color="error" label={`Errors: ${status.errorCount}`} />
          )}
        </Stack>
      </CardContent>
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
  onChange: (event: SelectChangeEvent<string>) => void;
  helperContent?: React.ReactNode;
}

const FieldSelect: React.FC<FieldSelectProps> = ({ label, value, options, metadata, disabled, allowEmpty, onChange, helperContent }) => (
  <FormControl
    fullWidth
    disabled={disabled || metadata?.locked}
    size="small"
    sx={{ mb: 1, opacity: metadata?.locked ? 0.6 : 1 }}
  >
    <InputLabel>{label}</InputLabel>
    <Select label={label} value={value} onChange={onChange}>
      {allowEmpty && <MenuItem value="">(None)</MenuItem>}
      {options.map(option => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
    <FieldHelper metadata={metadata} />
    {helperContent}
  </FormControl>
);

const FieldHelper: React.FC<{ metadata?: FieldMetadata; fallback?: string }> = ({ metadata, fallback }) => {
  if (!metadata) {
    return fallback ? <FormHelperText>{fallback}</FormHelperText> : null;
  }

  if (metadata.locked && metadata.envVar) {
    return <FormHelperText sx={{ color: 'text.secondary' }}>Defined via environment variable {metadata.envVar}</FormHelperText>;
  }

  if (metadata.source === 'user') {
    return <FormHelperText sx={{ color: 'text.secondary' }}>Stored override persisted from WebUI</FormHelperText>;
  }

  return fallback ? <FormHelperText>{fallback}</FormHelperText> : null;
};

const StatusLine: React.FC<{ label: string; configured: boolean; detail: string }> = ({ label, configured, detail }) => (
  <Stack direction="row" spacing={1} alignItems="center" mt={1}>
    {configured ? <CheckCircleIcon color="success" fontSize="small" /> : <CancelIcon color="error" fontSize="small" />}
    <Typography variant="body2" color={configured ? 'success.main' : 'error.main'}>
      {label}: {detail}
    </Typography>
  </Stack>
);

const connectionStatusLabel = (connected?: boolean, statusText?: string): { icon: React.ReactNode; color: 'success' | 'default' | 'error'; label: string } => {
  if (connected === true) {
    return { icon: <CheckCircleIcon color="success" fontSize="small" />, color: 'success', label: statusText || 'Connected' };
  }
  if (connected === false) {
    return { icon: <CancelIcon color="error" fontSize="small" />, color: 'error', label: statusText || 'Disconnected' };
  }
  return { icon: <CancelIcon color="disabled" fontSize="small" />, color: 'default', label: statusText || 'Unknown' };
};

const renderProviderHelper = (info?: ProviderInfo) => {
  if (!info) return null;

  if (!info.docsUrl && !info.helpText) {
    return null;
  }

  return (
    <FormHelperText sx={{ display: 'flex', flexDirection: 'column' }}>
      {info.helpText}
      {info.docsUrl && (
        <a href={info.docsUrl} target="_blank" rel="noopener noreferrer">
          Provider setup guide
        </a>
      )}
    </FormHelperText>
  );
};

export default AgentConfigCard;
