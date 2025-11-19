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
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

interface ToolUsageGuard {
  id: string;
  name: string;
  toolName: string;
  guardType: 'owner' | 'userList' | 'role';
  config: {
    allowedUsers?: string[];
    allowedRoles?: string[];
    ownerOnly?: boolean;
  };
  isActive: boolean;
}

const ToolUsageGuardsConfig: React.FC = () => {
  const [guards, setGuards] = useState<ToolUsageGuard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGuard, setEditingGuard] = useState<ToolUsageGuard | null>(null);
  const [formData, setFormData] = useState<Partial<ToolUsageGuard>>({
    name: '',
    toolName: '',
    guardType: 'owner',
    config: {
      allowedUsers: [],
      allowedRoles: [],
      ownerOnly: false,
    },
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const guardTypes = [
    { value: 'owner', label: 'Owner Only' },
    { value: 'userList', label: 'Specific Users' },
    { value: 'role', label: 'User Roles' },
  ];

  const fetchGuards = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/tool-usage-guards');
      if (!response.ok) {
        throw new Error('Failed to fetch tool usage guards');
      }
      const data = await response.json();
      setGuards(data.guards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tool usage guards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuards();
  }, []);

  const handleOpenDialog = (guard?: ToolUsageGuard) => {
    setEditingGuard(guard || null);
    setFormData(guard || {
      name: '',
      toolName: '',
      guardType: 'owner',
      config: {
        allowedUsers: [],
        allowedRoles: [],
        ownerOnly: false,
      },
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGuard(null);
    setFormData({
      name: '',
      toolName: '',
      guardType: 'owner',
      config: {
        allowedUsers: [],
        allowedRoles: [],
        ownerOnly: false,
      },
    });
  };

  const handleSaveGuard = async () => {
    try {
      const url = editingGuard
        ? `/api/admin/tool-usage-guards/${editingGuard.id}`
        : '/api/admin/tool-usage-guards';
      
      const method = editingGuard ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingGuard ? 'update' : 'create'} tool usage guard`);
      }

      setSnackbar({
        open: true,
        message: `Tool usage guard ${editingGuard ? 'updated' : 'created'} successfully`,
        severity: 'success',
      });
      handleCloseDialog();
      fetchGuards();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : `Failed to ${editingGuard ? 'update' : 'create'} tool usage guard`,
        severity: 'error',
      });
    }
  };

  const handleDeleteGuard = async (guardId: string) => {
    if (!confirm('Are you sure you want to delete this tool usage guard?')) return;

    try {
      const response = await fetch(`/api/admin/tool-usage-guards/${guardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tool usage guard');
      }

      setSnackbar({
        open: true,
        message: 'Tool usage guard deleted successfully',
        severity: 'success',
      });
      fetchGuards();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete tool usage guard',
        severity: 'error',
      });
    }
  };

  const handleToggleActive = async (guardId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/tool-usage-guards/${guardId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update guard status');
      }

      fetchGuards();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update guard status',
        severity: 'error',
      });
    }
  };

  if (loading) {
    return <Typography>Loading tool usage guards...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Tool Usage Guards</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Tool Usage Guard
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {guards.map((guard) => (
          <Grid item xs={12} md={6} key={guard.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6">{guard.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Tool: {guard.toolName}
                    </Typography>
                    <Chip
                      label={guard.guardType}
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={guard.isActive ? 'Active' : 'Inactive'}
                      size="small"
                      color={guard.isActive ? 'success' : 'default'}
                    />
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(guard)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteGuard(guard.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={2} mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Status: {guard.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleToggleActive(guard.id, !guard.isActive)}
                  >
                    {guard.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGuard ? 'Edit Tool Usage Guard' : 'Add New Tool Usage Guard'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Guard Name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Tool Name"
              value={formData.toolName || ''}
              onChange={(e) => setFormData({ ...formData, toolName: e.target.value })}
              margin="normal"
              helperText="Name of the tool to guard"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Guard Type</InputLabel>
              <Select
                value={formData.guardType || 'owner'}
                onChange={(e) => setFormData({
                  ...formData,
                  guardType: e.target.value as 'owner' | 'userList' | 'role'
                })}
              >
                {guardTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.guardType === 'owner' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.config?.ownerOnly || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, ownerOnly: e.target.checked }
                    })}
                  />
                }
                label="Owner Only"
              />
            )}

            {formData.guardType === 'userList' && (
              <TextField
                fullWidth
                label="Allowed Users"
                value={formData.config?.allowedUsers?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    allowedUsers: e.target.value.split(',').map(u => u.trim()).filter(u => u)
                  }
                })}
                margin="normal"
                helperText="Comma-separated list of user IDs"
              />
            )}

            {formData.guardType === 'role' && (
              <TextField
                fullWidth
                label="Allowed Roles"
                value={formData.config?.allowedRoles?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    allowedRoles: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                  }
                })}
                margin="normal"
                helperText="Comma-separated list of user roles"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveGuard} variant="contained">
            {editingGuard ? 'Update' : 'Create'}
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

export default ToolUsageGuardsConfig;