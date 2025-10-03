import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';
import {
  selectConfig,
  selectConfigError,
} from '../store/slices/configSlice';
import LoadingSpinner from './LoadingSpinner';

const ConfigManager: React.FC = () => {
  const config = useAppSelector(selectConfig);
  const configError = useAppSelector(selectConfigError);
  const [selectedEnv, setSelectedEnv] = useState<string>('development');
  const [hasChanges, setHasChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Mock configuration data for demonstration
  const mockConfigs = [
    { id: 'dev', name: 'Development', environment: 'development', isActive: true, lastModified: new Date('2024-09-25T10:30:00Z') },
    { id: 'staging', name: 'Staging', environment: 'staging', isActive: false, lastModified: new Date('2024-09-24T15:45:00Z') },
    { id: 'prod', name: 'Production', environment: 'production', isActive: false, lastModified: new Date('2024-09-23T08:20:00Z') },
  ];

  const [editingConfig, setEditingConfig] = useState(mockConfigs[0]);
  const [configs, setConfigs] = useState(mockConfigs);

  const handleSaveConfig = () => {
    // Basic validation
    const errors: Record<string, string> = {};
    if (!editingConfig.name || editingConfig.name.trim() === '') {
      errors.name = 'Configuration name is required';
    }
    if (!editingConfig.environment || editingConfig.environment.trim() === '') {
      errors.environment = 'Environment is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSnackbar({
        open: true,
        message: 'Please fix validation errors before saving',
        severity: 'error',
      });
      return;
    }

    try {
      // Simulate saving configuration
      const updatedConfig = { ...editingConfig, lastModified: new Date() };
      setConfigs(prev => prev.map(c => c.id === editingConfig.id ? updatedConfig : c));
      setEditingConfig(updatedConfig);
      setHasChanges(false);
      setValidationErrors({});
      setSnackbar({
        open: true,
        message: 'Configuration saved successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save configuration',
        severity: 'error',
      });
    }
  };

  const handleEnvironmentChange = (env: string) => {
    setSelectedEnv(env);
    const config = configs.find(c => c.environment === env) || configs[0];
    setEditingConfig(config);
  };

  const handleDeleteConfig = (config: any) => {
    setConfigToDelete(config);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteConfig = () => {
    if (configToDelete) {
      setConfigs(prev => prev.filter(c => c.id !== configToDelete.id));
      if (editingConfig.id === configToDelete.id) {
        setEditingConfig(configs[0] || null);
      }
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.environment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnvironment = filterEnvironment === 'all' || config.environment === filterEnvironment;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && config.isActive) ||
                         (filterStatus === 'inactive' && !config.isActive);
    return matchesSearch && matchesEnvironment && matchesStatus;
  });

  if (config.isLoading) {
    return <LoadingSpinner message="Loading configurations..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Configuration Manager
      </Typography>

      {configError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {configError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Configurations</Typography>
                <Tooltip title="Refresh configurations">
                  <IconButton onClick={() => console.log('Refresh configs')} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Search configurations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Environment</InputLabel>
                    <Select
                      value={filterEnvironment}
                      onChange={(e) => setFilterEnvironment(e.target.value)}
                      label="Environment"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="development">Development</MenuItem>
                      <MenuItem value="staging">Staging</MenuItem>
                      <MenuItem value="production">Production</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {filteredConfigs.map((config) => (
                <Box
                  key={config.id}
                  onClick={() => handleEnvironmentChange(config.environment)}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selectedEnv === config.environment ? 'action.selected' : 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body1">{config.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last Modified: {config.lastModified.toLocaleString()}
                      </Typography>
                      <Box display="flex" gap={1} mt={1}>
                        <Chip
                          label={config.environment}
                          size="small"
                          variant="outlined"
                        />
                        {config.isActive && (
                          <Chip
                            label="Active"
                            size="small"
                            color="success"
                          />
                        )}
                      </Box>
                    </Box>
                    <Tooltip title="Delete configuration">
                      <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteConfig(config); }} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}

              {/* Delete Confirmation Dialog */}
              <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                  <Typography>
                    Are you sure you want to delete the configuration "{configToDelete?.name}"?
                    This action cannot be undone.
                  </Typography>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                  <Button onClick={confirmDeleteConfig} color="error">Delete</Button>
                </DialogActions>
              </Dialog>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {editingConfig ? (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">Edit Configuration</Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setEditingConfig(mockConfigs[0])}
                      startIcon={<RefreshIcon />}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveConfig}
                      disabled={!hasChanges}
                      startIcon={<SaveIcon />}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Configuration Name"
                      value={editingConfig.name || ''}
                      error={!!validationErrors.name}
                      helperText={validationErrors.name}
                      onChange={(e) => {
                        setEditingConfig({ ...editingConfig, name: e.target.value });
                        setHasChanges(true);
                        if (validationErrors.name) {
                          setValidationErrors(prev => ({ ...prev, name: '' }));
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Environment"
                      value={editingConfig.environment || 'development'}
                      error={!!validationErrors.environment}
                      helperText={validationErrors.environment}
                      onChange={(e) => {
                        setEditingConfig({ ...editingConfig, environment: e.target.value });
                        setHasChanges(true);
                        if (validationErrors.environment) {
                          setValidationErrors(prev => ({ ...prev, environment: '' }));
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editingConfig.isActive || false}
                          onChange={(e) => {
                            setEditingConfig({ ...editingConfig, isActive: e.target.checked });
                            setHasChanges(true);
                          }}
                        />
                      }
                      label="Active Configuration"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Select a configuration to edit
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConfigManager;