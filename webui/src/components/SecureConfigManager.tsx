import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { SecureConfig } from '../services/api';

const SecureConfigManager: React.FC = () => {
  const [configs, setConfigs] = useState<SecureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SecureConfig | null>(null);

  // Form states
  const [configName, setConfigName] = useState('');
  const [configData, setConfigData] = useState('');
  const [encryptSensitive, setEncryptSensitive] = useState(true);
  const [backupFile, setBackupFile] = useState('');

  const resetForm = () => {
    setConfigName('');
    setConfigData('');
    setEncryptSensitive(true);
    setBackupFile('');
    setError(null);
    setSuccess(null);
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSecureConfigs();
      setConfigs(response.configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleCreateConfig = async () => {
    if (!configName.trim() || !configData.trim()) {
      setError('Configuration name and data are required');
      return;
    }

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(configData);
      } catch {
        setError('Configuration data must be valid JSON');
        return;
      }

      await apiService.saveSecureConfig(configName, parsedData, encryptSensitive);
      setSuccess(`Configuration '${configName}' saved securely!`);
      setCreateDialogOpen(false);
      resetForm();
      fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedConfig) return;

    try {
      await apiService.deleteSecureConfig(selectedConfig.name);
      setSuccess(`Configuration '${selectedConfig.name}' deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedConfig(null);
      fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await apiService.backupSecureConfigs();
      setSuccess(`Backup created: ${response.backupFile}`);
      setBackupDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    }
  };

  const handleRestore = async () => {
    if (!backupFile.trim()) {
      setError('Backup file path is required');
      return;
    }

    try {
      await apiService.restoreSecureConfigs(backupFile);
      setSuccess('Configuration restored from backup successfully!');
      setRestoreDialogOpen(false);
      resetForm();
      fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore from backup');
    }
  };

  const openDeleteDialog = (config: SecureConfig) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
          <SecurityIcon sx={{ mr: 1 }} />
          Secure Configuration Manager
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BackupIcon />}
            onClick={() => setBackupDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => setRestoreDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Restore
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Config
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box display="flex" flexWrap="wrap" gap={2}>
        {configs.map((config) => (
          <Card key={config.id} sx={{ minWidth: 300, flex: '1 1 auto' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h3">
                  {config.name}
                </Typography>
              </Box>

              <Box mb={2}>
                <Chip
                  label={config.encrypted ? 'Encrypted' : 'Plain Text'}
                  color={config.encrypted ? 'success' : 'warning'}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`ID: ${config.id.slice(0, 8)}...`}
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Created: {new Date(config.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated: {new Date(config.updatedAt).toLocaleString()}
              </Typography>
            </CardContent>

            <CardActions>
              <Tooltip title="Delete Configuration">
                <IconButton
                  size="small"
                  onClick={() => openDeleteDialog(config)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </CardActions>
          </Card>
        ))}
      </Box>

      {configs.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No secure configurations found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first secure configuration to get started
          </Typography>
        </Box>
      )}

      {/* Create Configuration Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Secure Configuration</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Configuration Name"
            fullWidth
            variant="outlined"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Configuration Data (JSON)"
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            value={configData}
            onChange={(e) => setConfigData(e.target.value)}
            placeholder='{"apiKey": "your-secret-key", "database": {"host": "localhost"}}'
            sx={{ mb: 2 }}
          />

          <Box display="flex" alignItems="center">
            <Typography variant="body2" sx={{ mr: 2 }}>
              Encrypt sensitive data:
            </Typography>
            <Button
              variant={encryptSensitive ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setEncryptSensitive(true)}
              sx={{ mr: 1 }}
            >
              Yes
            </Button>
            <Button
              variant={!encryptSensitive ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setEncryptSensitive(false)}
            >
              No
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateConfig}
            variant="contained"
          >
            Save Securely
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Configuration Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Secure Configuration</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the configuration "{selectedConfig?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone and will permanently remove the configuration.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfig}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <Typography>
            Create a backup of all secure configurations?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will create a timestamped backup file in the secure config directory.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBackup}
            variant="contained"
          >
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => {
          setRestoreDialogOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore from Backup</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Backup File Path"
            fullWidth
            variant="outlined"
            value={backupFile}
            onChange={(e) => setBackupFile(e.target.value)}
            placeholder="/path/to/backup-file.json"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Enter the full path to the backup file you want to restore from.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRestoreDialogOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            variant="contained"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SecureConfigManager;