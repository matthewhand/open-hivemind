import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Compare as CompareIcon,
  Sync as SyncIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface Environment {
  id: string;
  name: string;
  description: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'syncing';
  driftDetected: boolean;
  lastSync: string;
}

interface EnvironmentComparison {
  environment1: string;
  environment2: string;
  differences: Array<{
    path: string;
    value1: any;
    value2: any;
    type: 'added' | 'removed' | 'modified';
  }>;
}

const EnvironmentManager: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [comparison, setComparison] = useState<EnvironmentComparison | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    config: {} as Record<string, any>
  });

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from an API
      // For now, we'll simulate some environments
      const mockEnvironments: Environment[] = [
        {
          id: 'dev',
          name: 'Development',
          description: 'Development environment for testing',
          config: { debug: true, logLevel: 'debug' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          status: 'active',
          driftDetected: false,
          lastSync: '2024-01-15T00:00:00Z'
        },
        {
          id: 'staging',
          name: 'Staging',
          description: 'Staging environment for pre-production testing',
          config: { debug: false, logLevel: 'info' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-14T00:00:00Z',
          status: 'active',
          driftDetected: true,
          lastSync: '2024-01-14T00:00:00Z'
        },
        {
          id: 'prod',
          name: 'Production',
          description: 'Production environment',
          config: { debug: false, logLevel: 'error' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-13T00:00:00Z',
          status: 'active',
          driftDetected: false,
          lastSync: '2024-01-13T00:00:00Z'
        }
      ];
      setEnvironments(mockEnvironments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnvironment = async () => {
    if (!formData.name.trim()) {
      setError('Environment name is required');
      return;
    }

    try {
      setLoading(true);
      // In a real implementation, this would create the environment via API
      const newEnvironment: Environment = {
        id: formData.name.toLowerCase().replace(/\s+/g, '-'),
        name: formData.name,
        description: formData.description,
        config: formData.config,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        driftDetected: false,
        lastSync: new Date().toISOString()
      };

      setEnvironments(prev => [...prev, newEnvironment]);
      setSuccess('Environment created successfully!');
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '', config: {} });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create environment');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEnvironment = async (envId: string) => {
    try {
      setLoading(true);
      // In a real implementation, this would sync the environment
      setEnvironments(prev =>
        prev.map(env =>
          env.id === envId
            ? { ...env, status: 'syncing' as const, lastSync: new Date().toISOString() }
            : env
        )
      );

      // Simulate sync completion
      setTimeout(() => {
        setEnvironments(prev =>
          prev.map(env =>
            env.id === envId
              ? { ...env, status: 'active' as const, driftDetected: false }
              : env
          )
        );
        setSuccess(`Environment ${envId} synced successfully!`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync environment');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareEnvironments = async () => {
    if (selectedEnvironments.length !== 2) {
      setError('Please select exactly 2 environments to compare');
      return;
    }

    try {
      setLoading(true);
      const [env1, env2] = selectedEnvironments.map(id =>
        environments.find(env => env.id === id)
      );

      if (!env1 || !env2) {
        setError('Selected environments not found');
        return;
      }

      // Simple comparison logic
      const differences: EnvironmentComparison['differences'] = [];

      const compareObjects = (obj1: any, obj2: any, path = '') => {
        const keys1 = Object.keys(obj1 || {});
        const keys2 = Object.keys(obj2 || {});

        // Check for added/removed keys
        keys1.forEach(key => {
          if (!(key in obj2)) {
            differences.push({
              path: path + key,
              value1: obj1[key],
              value2: undefined,
              type: 'removed'
            });
          }
        });

        keys2.forEach(key => {
          if (!(key in obj1)) {
            differences.push({
              path: path + key,
              value1: undefined,
              value2: obj2[key],
              type: 'added'
            });
          }
        });

        // Check for modified values
        keys1.forEach(key => {
          if (key in obj2) {
            if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
              differences.push({
                path: path + key,
                value1: obj1[key],
                value2: obj2[key],
                type: 'modified'
              });
            }
          }
        });
      };

      compareObjects(env1.config, env2.config);

      setComparison({
        environment1: env1.name,
        environment2: env2.name,
        differences
      });

      setCompareDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare environments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'syncing': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Environment Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CompareIcon />}
            onClick={handleCompareEnvironments}
            disabled={selectedEnvironments.length !== 2 || loading}
          >
            Compare Selected
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            disabled={loading}
          >
            Create Environment
          </Button>
        </Box>
      </Box>

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

      {/* Environment Grid */}
      <Grid container spacing={3}>
        {environments.map((env) => (
          <Grid item xs={12} md={6} lg={4} key={env.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" component="h2">
                      {env.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {env.description}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={env.status}
                      color={getStatusColor(env.status)}
                      size="small"
                    />
                    {env.driftDetected && (
                      <Tooltip title="Configuration drift detected">
                        <WarningIcon color="warning" />
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Last Sync: {new Date(env.lastSync).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated: {new Date(env.updatedAt).toLocaleString()}
                  </Typography>
                </Box>

                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    startIcon={<SyncIcon />}
                    onClick={() => handleSyncEnvironment(env.id)}
                    disabled={loading || env.status === 'syncing'}
                  >
                    {env.status === 'syncing' ? 'Syncing...' : 'Sync'}
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newSelection = selectedEnvironments.includes(env.id)
                        ? selectedEnvironments.filter(id => id !== env.id)
                        : [...selectedEnvironments, env.id].slice(-2); // Keep only last 2
                      setSelectedEnvironments(newSelection);
                    }}
                    color={selectedEnvironments.includes(env.id) ? 'primary' : 'default'}
                  >
                    <CompareIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Environment Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Environment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Environment Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="Configuration (JSON)"
            value={JSON.stringify(formData.config, null, 2)}
            onChange={(e) => {
              try {
                const config = JSON.parse(e.target.value);
                setFormData(prev => ({ ...prev, config }));
              } catch (err) {
                // Invalid JSON, keep current value
              }
            }}
            multiline
            rows={8}
            helperText="Enter environment-specific configuration as JSON"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateEnvironment}
            variant="contained"
            disabled={loading || !formData.name.trim()}
          >
            {loading ? 'Creating...' : 'Create Environment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Environments Dialog */}
      <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Environment Comparison: {comparison?.environment1} vs {comparison?.environment2}
        </DialogTitle>
        <DialogContent>
          {comparison && (
            <List dense>
              {comparison.differences.map((diff, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {diff.path}
                        </Typography>
                        <Chip
                          label={diff.type}
                          size="small"
                          color={
                            diff.type === 'added' ? 'success' :
                            diff.type === 'removed' ? 'error' : 'warning'
                          }
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ mr: 2 }}>
                          {comparison.environment1}: {JSON.stringify(diff.value1)}
                        </Typography>
                        <Typography variant="caption">
                          {comparison.environment2}: {JSON.stringify(diff.value2)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {comparison.differences.length === 0 && (
                <ListItem>
                  <ListItemText primary="No differences found" />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnvironmentManager;