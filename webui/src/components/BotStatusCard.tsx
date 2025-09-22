import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { Bot } from '../services/api';

interface BotStatusCardProps {
  bot: Bot;
  statusData?: {
    status: string;
    healthDetails?: Record<string, unknown>;
    connected?: boolean;
    messageCount?: number;
    errorCount?: number;
    lastActivity?: string;
    uptime?: number;
    responseTime?: number;
  };
  onRefresh?: () => void;
}

const BotStatusCard: React.FC<BotStatusCardProps> = ({
  bot,
  statusData,
  onRefresh
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'error':
      case 'disconnected':
        return <ErrorIcon color="error" />;
      case 'warning':
      case 'connecting':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="action" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'connected':
        return 'success';
      case 'error':
      case 'disconnected':
        return 'error';
      case 'warning':
      case 'connecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'discord':
        return '🤖';
      case 'slack':
        return '💬';
      case 'mattermost':
        return '📱';
      default:
        return '🔧';
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatResponseTime = (ms: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getHealthScore = () => {
    if (!statusData) return 0;

    let score = 100;
    if (statusData.status !== 'active') score -= 30;
    if (statusData.errorCount && statusData.errorCount > 0) score -= 20;
    if (statusData.responseTime && statusData.responseTime > 2000) score -= 15;
    if (!statusData.connected) score -= 25;

    return Math.max(0, score);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const healthScore = getHealthScore();

  return (
    <>
      <Card
        sx={{
          minWidth: 350,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3,
          }
        }}
      >
        <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" component="h3">
                {getProviderIcon(bot.messageProvider)}
              </Typography>
              <Typography variant="h6" component="h3">
                {bot.name}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {getStatusIcon(statusData?.status || 'unknown')}
              <Chip
                label={statusData?.status || 'unknown'}
                size="small"
                color={getStatusColor(statusData?.status || 'unknown')}
              />
            </Box>
          </Box>

          {/* Provider and LLM Info */}
          <Box display="flex" gap={1} mb={2}>
            <Chip
              label={`Provider: ${bot.messageProvider}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`LLM: ${bot.llmProvider}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
            {bot.persona && (
              <Chip
                label={`Persona: ${bot.persona}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* Health Score */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Health Score
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {healthScore}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={healthScore}
              color={getHealthColor(healthScore)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Quick Stats */}
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {statusData?.messageCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Messages
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="error">
                {statusData?.errorCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Errors
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="success">
                {statusData?.connected ? '✓' : '✗'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Connected
              </Typography>
            </Box>
          </Box>

          {/* Additional Info */}
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Response Time: {formatResponseTime(statusData?.responseTime || 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Uptime: {formatUptime(statusData?.uptime || 0)}
            </Typography>
            {statusData?.lastActivity && (
              <Typography variant="body2" color="text.secondary">
                Last Activity: {new Date(statusData.lastActivity).toLocaleString()}
              </Typography>
            )}
          </Box>

          {/* Action Buttons */}
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setDetailsOpen(true)}
            >
              Details
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  if (onRefresh) onRefresh();
                }, 1000);
              }}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Information Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Bot Details - {bot.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Basic Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Name:</strong>
                    </Typography>
                    <Typography variant="body2">{bot.name}</Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Message Provider:</strong>
                    </Typography>
                    <Typography variant="body2">{bot.messageProvider}</Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>LLM Provider:</strong>
                    </Typography>
                    <Typography variant="body2">{bot.llmProvider}</Typography>
                  </Box>
                  {bot.persona && (
                    <Box display="flex" gap={2}>
                      <Typography variant="body2" sx={{ minWidth: 120 }}>
                        <strong>Persona:</strong>
                      </Typography>
                      <Typography variant="body2">{bot.persona}</Typography>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Status Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Status Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Status:</strong>
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(statusData?.status || 'unknown')}
                      <Typography variant="body2">{statusData?.status || 'Unknown'}</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Connected:</strong>
                    </Typography>
                    <Typography variant="body2">
                      {statusData?.connected ? 'Yes' : 'No'}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Health Score:</strong>
                    </Typography>
                    <Typography variant="body2">{healthScore}%</Typography>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Performance Metrics */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Performance Metrics</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Messages:</strong>
                    </Typography>
                    <Typography variant="body2">{statusData?.messageCount || 0}</Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Errors:</strong>
                    </Typography>
                    <Typography variant="body2" color="error">
                      {statusData?.errorCount || 0}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Response Time:</strong>
                    </Typography>
                    <Typography variant="body2">
                      {formatResponseTime(statusData?.responseTime || 0)}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      <strong>Uptime:</strong>
                    </Typography>
                    <Typography variant="body2">
                      {formatUptime(statusData?.uptime || 0)}
                    </Typography>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Health Details */}
            {statusData?.healthDetails && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Health Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box display="flex" flexDirection="column" gap={2}>
                    {Object.entries(statusData.healthDetails).map(([key, value]) => (
                      <Box key={key} display="flex" gap={2}>
                        <Typography variant="body2" sx={{ minWidth: 120 }}>
                          <strong>{key}:</strong>
                        </Typography>
                        <Typography variant="body2">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Configuration */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Configuration</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2}>
                  {bot.systemInstruction && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>System Instruction:</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                        {bot.systemInstruction}
                      </Typography>
                    </Box>
                  )}
                  {bot.mcpServers && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>MCP Servers:</strong>
                      </Typography>
                      <Typography variant="body2">
                        {Array.isArray(bot.mcpServers) ? bot.mcpServers.length : 1} server(s) configured
                      </Typography>
                    </Box>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BotStatusCard;