/**
 * @fileoverview System Information Component
 *
 * Displays detailed system information including uptime, environment,
 * logs, and system control options.
 *
 * @version 1.0.0
 * @author Open-Hivemind Team
 * @since 2025-09-27
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as ShutdownIcon,
  PlayArrow as RestartIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';

const SystemInfo: React.FC = () => {
  const dashboard = useAppSelector(state => state.dashboard);
  const {
    systemStatus,
    lastUpdated,
    isAutoRefresh,
    refreshInterval,
  } = dashboard;

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'restart' | 'shutdown' | null;
    message: string;
  }>({
    open: false,
    action: null,
    message: '',
  });

  const [logs, setLogs] = useState<string[]>([
    '[2025-09-27 07:00:00] System started successfully',
    '[2025-09-27 07:01:00] Bot instance #1 connected',
    '[2025-09-27 07:02:00] Performance metrics updated',
    '[2025-09-27 07:03:00] Configuration reloaded',
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const uptimeSeconds = systemStatus.uptime ?? 0;
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeDisplay = `${uptimeHours}h ${uptimeMinutes}m`;

  const handleSystemAction = async (action: 'restart' | 'shutdown') => {
    setIsLoading(true);
    try {
      // TODO: Implement API call for system action
      console.log(`Performing system ${action}...`);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLogs(prev => [...prev, `[${new Date().toISOString()}] System ${action} initiated`]);
    } catch (error) {
      console.error(`Failed to ${action} system:`, error);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ open: false, action: null, message: '' });
    }
  };

  const handleDownloadLogs = () => {
    const logContent = logs.join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const openConfirmDialog = (action: 'restart' | 'shutdown') => {
    const message = action === 'restart'
      ? 'Are you sure you want to restart the system? This will temporarily disconnect all bots.'
      : 'Are you sure you want to shut down the system? This will stop all services.';
    setConfirmDialog({ open: true, action, message });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, action: null, message: '' });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        System Information
      </Typography>

      <Grid container spacing={3}>
        {/* System Status Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated: {new Date(lastUpdated).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Auto Refresh: {isAutoRefresh ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Refresh Interval: {(refreshInterval / 1000).toFixed(1)}s
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Environment: {systemStatus.environment}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Uptime: {uptimeDisplay}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Controls Card */}
        <Grid item xs={12} md={6}>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Controls
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Tooltip title="Restart System">
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<RestartIcon />}
                    onClick={() => openConfirmDialog('restart')}
                    disabled={isLoading}
                  >
                    Restart
                  </Button>
                </Tooltip>
                <Tooltip title="Shutdown System">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<ShutdownIcon />}
                    onClick={() => openConfirmDialog('shutdown')}
                    disabled={isLoading}
                  >
                    Shutdown
                  </Button>
                </Tooltip>
              </Box>
              {isLoading && (
                <Box display="flex" alignItems="center" gap={1} mt={2}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Processing system action...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Logs Card */}
        <Grid item xs={12}>
          <Card elevation={1}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  System Logs
                </Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title="Download Logs">
                    <IconButton onClick={handleDownloadLogs} size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Clear Logs">
                    <IconButton onClick={handleClearLogs} size="small">
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {logs.length === 0 ? (
                  <Typography color="text.secondary">No logs available</Typography>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: 4 }}>
                      {log}
                    </div>
                  ))
                )}
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">
          Confirm System Action
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => confirmDialog.action && handleSystemAction(confirmDialog.action)}
            color={confirmDialog.action === 'shutdown' ? 'error' : 'warning'}
            variant="contained"
            disabled={isLoading}
          >
            {confirmDialog.action === 'shutdown' ? 'Shutdown' : 'Restart'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemInfo;