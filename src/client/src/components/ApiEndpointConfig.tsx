import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface EndpointConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  expectedStatusCodes?: number[];
  timeout?: number;
  interval?: number;
  enabled: boolean;
  retries?: number;
  retryDelay?: number;
}

interface ApiEndpointConfigProps {
  onEndpointsChange?: () => void;
}

const ApiEndpointConfig: React.FC<ApiEndpointConfigProps> = ({ onEndpointsChange }) => {
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<EndpointConfig | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET' as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
    headers: '',
    body: '',
    expectedStatusCodes: '200,201,202,204',
    timeout: 10000,
    interval: 60000,
    enabled: true,
    retries: 3,
    retryDelay: 1000,
  });

  const fetchEndpoints = async () => {
    try {
      // For now, we'll use a mock implementation since the API endpoint isn't fully implemented
      // In a real implementation, this would call apiService.getApiEndpoints()
      setEndpoints([]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleOpenDialog = (endpoint?: EndpointConfig) => {
    if (endpoint) {
      setEditingEndpoint(endpoint);
      setFormData({
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        headers: endpoint.headers ? JSON.stringify(endpoint.headers, null, 2) : '',
        body: endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '',
        expectedStatusCodes: endpoint.expectedStatusCodes?.join(',') || '200,201,202,204',
        timeout: endpoint.timeout || 10000,
        interval: endpoint.interval || 60000,
        enabled: endpoint.enabled,
        retries: endpoint.retries || 3,
        retryDelay: endpoint.retryDelay || 1000,
      });
    } else {
      setEditingEndpoint(null);
      setFormData({
        name: '',
        url: '',
        method: 'GET',
        headers: '',
        body: '',
        expectedStatusCodes: '200,201,202,204',
        timeout: 10000,
        interval: 60000,
        enabled: true,
        retries: 3,
        retryDelay: 1000,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEndpoint(null);
  };

  const handleSubmit = async () => {
    try {
      const endpointData = {
        id: editingEndpoint?.id || `endpoint_${Date.now()}`,
        name: formData.name,
        url: formData.url,
        method: formData.method,
        headers: formData.headers ? JSON.parse(formData.headers) : undefined,
        body: formData.body ? JSON.parse(formData.body) : undefined,
        expectedStatusCodes: formData.expectedStatusCodes.split(',').map(code => parseInt(code.trim())),
        timeout: formData.timeout,
        interval: formData.interval,
        enabled: formData.enabled,
        retries: formData.retries,
        retryDelay: formData.retryDelay,
      };

      if (editingEndpoint) {
        await apiService.updateApiEndpoint(editingEndpoint.id, endpointData);
        setSnackbar({ open: true, message: 'Endpoint updated successfully', severity: 'success' });
      } else {
        await apiService.addApiEndpoint(endpointData);
        setSnackbar({ open: true, message: 'Endpoint added successfully', severity: 'success' });
      }

      handleCloseDialog();
      fetchEndpoints();
      onEndpointsChange?.();
    } catch (error) {
      console.error('Failed to save endpoint:', error);
      setSnackbar({ open: true, message: 'Failed to save endpoint', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.removeApiEndpoint(id);
      setSnackbar({ open: true, message: 'Endpoint deleted successfully', severity: 'success' });
      fetchEndpoints();
      onEndpointsChange?.();
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      setSnackbar({ open: true, message: 'Failed to delete endpoint', severity: 'error' });
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await apiService.updateApiEndpoint(id, { enabled });
      fetchEndpoints();
      onEndpointsChange?.();
    } catch (error) {
      console.error('Failed to toggle endpoint:', error);
    }
  };

  const formatInterval = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading endpoints...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            API Endpoint Configuration
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            variant="contained"
            size="small"
          >
            Add Endpoint
          </Button>
        </Box>

        {endpoints.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No API endpoints configured
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add your first endpoint to start monitoring
            </Typography>
          </Box>
        ) : (
          <List>
            {endpoints.map((endpoint) => (
              <ListItem key={endpoint.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">{endpoint.name}</Typography>
                      <Chip
                        label={endpoint.method}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={endpoint.enabled ? 'Enabled' : 'Disabled'}
                        size="small"
                        color={endpoint.enabled ? 'success' : 'default'}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {endpoint.url}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Interval: {formatInterval(endpoint.interval || 60000)} |
                        Timeout: {formatInterval(endpoint.timeout || 10000)} |
                        Retries: {endpoint.retries || 3}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    onClick={() => handleToggle(endpoint.id, !endpoint.enabled)}
                    size="small"
                    color={endpoint.enabled ? 'warning' : 'success'}
                  >
                    {endpoint.enabled ? <StopIcon /> : <PlayIcon />}
                  </IconButton>
                  <IconButton onClick={() => handleOpenDialog(endpoint)} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(endpoint.id)} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {/* Configuration Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingEndpoint ? 'Edit Endpoint' : 'Add New Endpoint'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                fullWidth
                required
                placeholder="https://api.example.com/health"
              />

              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                  <MenuItem value="HEAD">HEAD</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Headers (JSON)"
                value={formData.headers}
                onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder='{"Authorization": "Bearer token"}'
              />

              <TextField
                label="Body (JSON)"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder='{"key": "value"}'
              />

              <TextField
                label="Expected Status Codes"
                value={formData.expectedStatusCodes}
                onChange={(e) => setFormData({ ...formData, expectedStatusCodes: e.target.value })}
                fullWidth
                placeholder="200,201,202,204"
              />

              <Box display="flex" gap={2}>
                <TextField
                  label="Timeout (ms)"
                  type="number"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                  fullWidth
                />

                <TextField
                  label="Interval (ms)"
                  type="number"
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                  fullWidth
                />
              </Box>

              <Box display="flex" gap={2}>
                <TextField
                  label="Retries"
                  type="number"
                  value={formData.retries}
                  onChange={(e) => setFormData({ ...formData, retries: parseInt(e.target.value) })}
                  fullWidth
                />

                <TextField
                  label="Retry Delay (ms)"
                  type="number"
                  value={formData.retryDelay}
                  onChange={(e) => setFormData({ ...formData, retryDelay: parseInt(e.target.value) })}
                  fullWidth
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingEndpoint ? 'Update' : 'Add'} Endpoint
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
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
      </CardContent>
    </Card>
  );
};

export default ApiEndpointConfig;