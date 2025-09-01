import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Undo as UndoIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { ConfigurationChange } from '../../../src/config/HotReloadManager';

interface HotReloadStatus {
  isActive: boolean;
  changeHistoryCount: number;
  availableRollbacksCount: number;
  lastChange: ConfigurationChange | null;
}

const HotReloadManager: React.FC = () => {
  const [status, setStatus] = useState<HotReloadStatus | null>(null);
  const [changeHistory, setChangeHistory] = useState<ConfigurationChange[]>([]);
  const [availableRollbacks, setAvailableRollbacks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quick change dialog
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeData, setChangeData] = useState({
    botName: '',
    changes: {} as Record<string, any>
  });

  useEffect(() => {
    loadHotReloadData();
  }, []);

  const loadHotReloadData = async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes, rollbacksRes] = await Promise.all([
        fetch('/webui/api/config/hot-reload/status'),
        fetch('/webui/api/config/hot-reload/history'),
        fetch('/webui/api/config/hot-reload/rollbacks')
      ]);

      const statusData = await statusRes.json();
      const historyData = await historyRes.json();
      const rollbacksData = await rollbacksRes.json();

      if (statusData.success) setStatus(statusData.status);
      if (historyData.success) setChangeHistory(historyData.history);
      if (rollbacksData.success) setAvailableRollbacks(rollbacksData.rollbacks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hot reload data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChange = async () => {
    if (!changeData.botName || Object.keys(changeData.changes).length === 0) {
      setError('Please provide bot name and changes');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/webui/api/config/hot-reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'update',
          botName: changeData.botName,
          changes: changeData.changes
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Configuration change applied successfully!');
        setChangeDialogOpen(false);
        setChangeData({ botName: '', changes: {} });
        loadHotReloadData();
      } else {
        setError(result.message || 'Failed to apply changes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to rollback to this configuration? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/webui/api/config/hot-reload/rollback/${snapshotId}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Configuration rolled back successfully!');
        loadHotReloadData();
      } else {
        setError(result.message || 'Failed to rollback');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'create': return 'success';
      case 'update': return 'primary';
      case 'delete': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Hot Reload Configuration Manager
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => setChangeDialogOpen(true)}
            disabled={loading}
          >
            Apply Change
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadHotReloadData}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Status Overview */}
      {status && (
        <Box display="flex" gap={3} mb={4}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                {status.isActive ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
                <Typography variant="body2">
                  Hot Reload: {status.isActive ? 'Active' : 'Inactive'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Changes: {status.changeHistoryCount} | Rollbacks: {status.availableRollbacksCount}
              </Typography>
            </CardContent>
          </Card>

          {status.lastChange && (
            <Card sx={{ flex: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Last Change
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Chip
                    label={status.lastChange.type}
                    color={getChangeTypeColor(status.lastChange.type)}
                    size="small"
                  />
                  {status.lastChange.botName && (
                    <Typography variant="body2">
                      Bot: {status.lastChange.botName}
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatTimestamp(status.lastChange.timestamp)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Change History */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Change History
          </Typography>
          <List dense>
            {changeHistory.slice(0, 10).map((change) => (
              <ListItem key={change.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={change.type}
                        color={getChangeTypeColor(change.type)}
                        size="small"
                      />
                      {change.botName && (
                        <Typography variant="body2">
                          {change.botName}
                        </Typography>
                      )}
                      {change.applied && <CheckCircleIcon color="success" fontSize="small" />}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(change.timestamp)}
                      {change.rollbackAvailable && (
                        <Chip label="Rollback Available" size="small" color="warning" sx={{ ml: 1 }} />
                      )}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            {changeHistory.length === 0 && (
              <ListItem>
                <ListItemText primary="No changes yet" />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Available Rollbacks */}
      {availableRollbacks.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Rollbacks
            </Typography>
            <List dense>
              {availableRollbacks.map((snapshotId) => (
                <ListItem key={snapshotId} divider>
                  <ListItemText
                    primary={`Snapshot: ${snapshotId}`}
                    secondary="Click rollback to restore this configuration"
                  />
                  <Tooltip title="Rollback to this configuration">
                    <IconButton
                      color="warning"
                      onClick={() => handleRollback(snapshotId)}
                      disabled={loading}
                    >
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Quick Change Dialog */}
      <Dialog open={changeDialogOpen} onClose={() => setChangeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Apply Configuration Change</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Bot Name"
            value={changeData.botName}
            onChange={(e) => setChangeData(prev => ({ ...prev, botName: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Changes (JSON)"
            multiline
            rows={6}
            value={JSON.stringify(changeData.changes, null, 2)}
            onChange={(e) => {
              try {
                const changes = JSON.parse(e.target.value);
                setChangeData(prev => ({ ...prev, changes }));
              } catch (err) {
                // Invalid JSON, keep current value
              }
            }}
            helperText="Enter configuration changes as JSON"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleApplyChange}
            variant="contained"
            disabled={loading || !changeData.botName || Object.keys(changeData.changes).length === 0}
          >
            {loading ? <CircularProgress size={20} /> : 'Apply Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HotReloadManager;