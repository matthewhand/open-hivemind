import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import ProviderConfig from './ProviderConfig';

interface LLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'flowise' | 'openwebui' | 'openswarm';
  config: any;
  isActive: boolean;
}

const LLMProvidersConfig: React.FC = () => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const llmProviderTypes = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'flowise', label: 'Flowise' },
    { value: 'openwebui', label: 'OpenWebUI' },
    { value: 'openswarm', label: 'OpenSwarm' },
  ];

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/llm-providers');
      if (!response.ok) {
        throw new Error('Failed to fetch LLM providers');
      }
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LLM providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenDialog = (provider?: LLMProvider) => {
    setEditingProvider(provider || null);
    setFormData(provider?.config || {});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProvider(null);
    setFormData({});
  };

  const handleSaveProvider = async () => {
    try {
      const url = editingProvider
        ? `/api/admin/llm-providers/${editingProvider.id}`
        : '/api/admin/llm-providers';
      
      const method = editingProvider ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name || editingProvider?.name,
          type: formData.type || editingProvider?.type,
          config: formData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingProvider ? 'update' : 'create'} LLM provider`);
      }

      setSnackbar({
        open: true,
        message: `LLM provider ${editingProvider ? 'updated' : 'created'} successfully`,
        severity: 'success',
      });
      handleCloseDialog();
      fetchProviders();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : `Failed to ${editingProvider ? 'update' : 'create'} LLM provider`,
        severity: 'error',
      });
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this LLM provider?')) return;

    try {
      const response = await fetch(`/api/admin/llm-providers/${providerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete LLM provider');
      }

      setSnackbar({
        open: true,
        message: 'LLM provider deleted successfully',
        severity: 'success',
      });
      fetchProviders();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete LLM provider',
        severity: 'error',
      });
    }
  };

  const handleToggleActive = async (providerId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/llm-providers/${providerId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update provider status');
      }

      fetchProviders();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update provider status',
        severity: 'error',
      });
    }
  };

  if (loading) {
    return <Typography>Loading LLM providers...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">LLM Providers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add LLM Provider
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid item xs={12} md={6} key={provider.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">{provider.name}</Typography>
                    <Chip
                      label={provider.type}
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={provider.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={provider.isActive ? 'success' : 'default'}
                    />
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(provider)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteProvider(provider.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2} mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Status: {provider.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleToggleActive(provider.id, !provider.isActive)}
                  >
                    {provider.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProvider ? 'Edit LLM Provider' : 'Add New LLM Provider'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Provider Name"
              value={formData.name || editingProvider?.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              select
              label="Provider Type"
              value={formData.type || editingProvider?.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              margin="normal"
              disabled={!!editingProvider}
            >
              {llmProviderTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </TextField>

            {(formData.type || editingProvider?.type) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Provider Configuration
                </Typography>
                <ProviderConfig
                  provider={formData.type || editingProvider?.type}
                  config={formData}
                  onChange={setFormData}
                  showSecurityIndicators={true}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveProvider} variant="contained">
            {editingProvider ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LLMProvidersConfig;