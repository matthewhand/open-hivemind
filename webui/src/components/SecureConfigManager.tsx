import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import type { SecureConfig } from '../services/api';

interface SecureConfigManagerProps {
  onRefresh?: () => void;
}

const SecureConfigManager: React.FC<SecureConfigManagerProps> = ({ onRefresh }) => {
  const [configs, setConfigs] = useState<SecureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SecureConfig | null>(null);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const [formData, setFormData] = useState({
    name: '',
    data: {},
    encryptSensitive: true,
  });

  const [backupFile, setBackupFile] = useState('');

  // Mock data for demonstration - in real implementation, this would come from API
  useEffect(() => {
    const mockConfigs: SecureConfig[] = [
      {
        id: '1',
        name: 'discord-tokens',
        data: {
          'bot1_token': '••••••••',
          'bot2_token': '••••••••',
          'webhook_secret': '••••••••'
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-19T14:30:00Z',
        encrypted: true,
      },
      {
        id: '2',
        name: 'api-keys',
        data: {
          'openai_key': '••••••••',
          'database_url': '••••••••',
          'redis_password': '••••••••'
        },
        createdAt: '2024-01-16T09:15:00Z',
        updatedAt: '2024-01-18T16:45:00Z',
        encrypted: true,
      },
      {
        id: '3',
        name: 'ssl-certificates',
        data: {
          'cert_path': '/path/to/cert.pem',
          'key_path': '/path/to/key.pem',
          'ca_bundle': '••••••••'
        },
        createdAt: '2024-01-17T11:20:00Z',
        updatedAt: '2024-01-17T11:20:00Z',
        encrypted: false,
      },
    ];

    setConfigs(mockConfigs);
    setLoading(false);
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      data: {},
      encryptSensitive: true,
    });
    setEditingConfig(null);
  };

  const handleOpenDialog = (config?: SecureConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        data: config.data,
        encryptSensitive: config.encrypted,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showSnackbar('Please enter a configuration name', 'error');
      return;
    }

    try {
      if (editingConfig) {
        // Update existing config
        const updatedConfigs = configs.map(c =>
          c.id === editingConfig.id
            ? { ...c, ...formData, updatedAt: new Date().toISOString() }
            : c
        );
        setConfigs(updatedConfigs);
        showSnackbar(`Configuration "${formData.name}" updated successfully`, 'success');
      } else {
        // Create new config
        const newConfig: SecureConfig = {
          id: Date.now().toString(),
          name: formData.name,
          data: formData.data,
          encrypted: formData.encryptSensitive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConfigs([...configs, newConfig]);
        showSnackbar(`Configuration "${formData.name}" created successfully`, 'success');
      }

      handleCloseDialog();
      if (onRefresh) onRefresh();
    } catch {
      showSnackbar('Failed to save configuration', 'error');
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (!config) return;

    if (!confirm(`Are you sure you want to delete configuration "${config.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const updatedConfigs = configs.filter(c => c.id !== configId);
      setConfigs(updatedConfigs);
      showSnackbar(`Configuration "${config.name}" deleted successfully`, 'success');
      if (onRefresh) onRefresh();
    } catch {
      showSnackbar('Failed to delete configuration', 'error');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await apiService.backupSecureConfigs();
      showSnackbar(response.message || 'Backup created successfully', 'success');
      setBackupDialogOpen(false);
    } catch {
      showSnackbar('Failed to create backup', 'error');
    }
  };

  const handleRestore = async () => {
    if (!backupFile) {
      showSnackbar('Please select a backup file', 'error');
      return;
    }

    try {
      const response = await apiService.restoreSecureConfigs(backupFile);
      showSnackbar(response.message || 'Configuration restored successfully', 'success');
      setRestoreDialogOpen(false);
      setBackupFile('');
      if (onRefresh) onRefresh();
    } catch {
      showSnackbar('Failed to restore configuration', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatBytes = (obj: Record<string, unknown>) => {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Loading secure configurations...
            </Typography>
          </Box>
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
              <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Secure Configuration Manager
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<BackupIcon />}
                onClick={() => setBackupDialogOpen(true)}
              >
                Backup
              </Button>
              <Button
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={() => setRestoreDialogOpen(true)}
              >
                Restore
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                color="primary"
              >
                Add Config
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage encrypted configuration files and secure data storage.
          </Typography>

          <List>
            {configs.map((config, index) => (
              <React.Fragment key={config.id}>
                <ListItem>
                  <Box display="flex" alignItems="center" sx={{ mr: 2 }}>
                    {config.encrypted ? (
                      <LockIcon color="error" />
                    ) : (
                      <LockOpenIcon color="success" />
                    )}
                  </Box>

                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {config.name}
                        </Typography>
                        <Chip
                          label={config.encrypted ? 'Encrypted' : 'Plain Text'}
                          size="small"
                          color={config.encrypted ? 'error' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {Object.keys(config.data).length} keys • {formatBytes(config.data)} bytes
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated: {formatDate(config.updatedAt)}
                        </Typography>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Tooltip title="Edit Configuration">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(config)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete Configuration">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteConfig(config.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>

                {index < configs.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {configs.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No secure configurations found. Create your first configuration to get started.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Configuration Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Edit Secure Configuration' : 'Add New Secure Configuration'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Configuration Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
              placeholder="e.g., discord-tokens, api-keys"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.encryptSensitive}
                  onChange={(e) => setFormData({ ...formData, encryptSensitive: e.target.checked })}
                />
              }
              label="Encrypt sensitive data"
            />

            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              Configuration data should be provided as JSON. Sensitive values will be automatically encrypted if encryption is enabled.
            </Alert>

            <TextField
              fullWidth
              label="Configuration Data (JSON)"
              multiline
              rows={8}
              value={JSON.stringify(formData.data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, data: parsed });
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='{"key": "value", "secret": "••••••••"}'
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name}
          >
            {editingConfig ? 'Update Configuration' : 'Add Configuration'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Create a backup of all secure configurations. This will download an encrypted backup file.
          </Typography>
          <Alert severity="warning">
            Store backup files securely and do not share them with unauthorized users.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBackup} variant="contained" startIcon={<BackupIcon />}>
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>Restore from Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Restore configurations from a backup file. This will replace all existing secure configurations.
          </Typography>
          <TextField
            fullWidth
            label="Backup File Path"
            value={backupFile}
            onChange={(e) => setBackupFile(e.target.value)}
            placeholder="/path/to/backup.enc"
            sx={{ mb: 2 }}
          />
          <Alert severity="error">
            Warning: This will replace all existing secure configurations. Make sure you have a current backup before proceeding.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRestore} variant="contained" color="error" startIcon={<RestoreIcon />}>
            Restore Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SecureConfigManager;