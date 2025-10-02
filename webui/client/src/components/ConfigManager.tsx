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
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
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

  // Mock configuration data for demonstration
  const mockConfigs = [
    { id: 'dev', name: 'Development', environment: 'development', isActive: true },
    { id: 'staging', name: 'Staging', environment: 'staging', isActive: false },
    { id: 'prod', name: 'Production', environment: 'production', isActive: false },
  ];

  const [editingConfig, setEditingConfig] = useState(mockConfigs[0]);

  const handleSaveConfig = () => {
    try {
      // Simulate saving configuration
      console.log('Saving configuration:', editingConfig);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const handleEnvironmentChange = (env: string) => {
    setSelectedEnv(env);
    const config = mockConfigs.find(c => c.environment === env) || mockConfigs[0];
    setEditingConfig(config);
  };

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
              
              {mockConfigs.map((config) => (
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
                  </Box>
                </Box>
              ))}
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
                      onChange={(e) => {
                        setEditingConfig({ ...editingConfig, name: e.target.value });
                        setHasChanges(true);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Environment"
                      value={editingConfig.environment || 'development'}
                      onChange={(e) => {
                        setEditingConfig({ ...editingConfig, environment: e.target.value });
                        setHasChanges(true);
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
    </Box>
  );
};

export default ConfigManager;