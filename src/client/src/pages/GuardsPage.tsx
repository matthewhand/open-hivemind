import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Button,
  Alert,
  Snackbar,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setGuardsConfig } from '../store/slices/configSlice';

interface GuardsConfig {
  type: 'owner' | 'users' | 'disabled';
  allowedUsers: string[];
  allowedIPs: string[];
}

const GuardsPage: React.FC = () => {
  const dispatch = useDispatch();
  const guardsConfig = useSelector((state: RootState) => state.config.guards) as GuardsConfig;

  const [formData, setFormData] = useState<GuardsConfig>({
    type: 'disabled',
    allowedUsers: [],
    allowedIPs: [],
  });
  const [newUser, setNewUser] = useState('');
  const [newIP, setNewIP] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (guardsConfig) {
      setFormData(guardsConfig);
    }
  }, [guardsConfig]);

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      type: event.target.value as GuardsConfig['type'],
    });
  };

  const handleAddUser = () => {
    if (newUser.trim() && !formData.allowedUsers.includes(newUser.trim())) {
      setFormData({
        ...formData,
        allowedUsers: [...formData.allowedUsers, newUser.trim()],
      });
      setNewUser('');
    }
  };

  const handleRemoveUser = (user: string) => {
    setFormData({
      ...formData,
      allowedUsers: formData.allowedUsers.filter(u => u !== user),
    });
  };

  const handleAddIP = () => {
    if (newIP.trim() && !formData.allowedIPs.includes(newIP.trim())) {
      setFormData({
        ...formData,
        allowedIPs: [...formData.allowedIPs, newIP.trim()],
      });
      setNewIP('');
    }
  };

  const handleRemoveIP = (ip: string) => {
    setFormData({
      ...formData,
      allowedIPs: formData.allowedIPs.filter(i => i !== ip),
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/guards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save guards configuration');
      }

      dispatch(setGuardsConfig(formData));
      setSnackbar({ open: true, message: 'Guards configuration saved successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save guards configuration',
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        MCP Tool Guards
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure access controls for MCP tools. Guards determine who can execute MCP tool operations.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
            Guard Type
          </FormLabel>
          <RadioGroup
            value={formData.type}
            onChange={handleTypeChange}
            sx={{ mb: 3 }}
          >
            <FormControlLabel
              value="disabled"
              control={<Radio />}
              label="Disabled - No restrictions (anyone can use MCP tools)"
            />
            <FormControlLabel
              value="owner"
              control={<Radio />}
              label="Owner Only - Only the server/forum owner can use MCP tools"
            />
            <FormControlLabel
              value="users"
              control={<Radio />}
              label="Specific Users - Only listed users can use MCP tools"
            />
          </RadioGroup>
        </FormControl>

        {formData.type === 'users' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Allowed Users
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="User ID or Username"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddUser}
                disabled={!newUser.trim()}
              >
                Add
              </Button>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {formData.allowedUsers.map((user) => (
                <Chip
                  key={user}
                  label={user}
                  onDelete={() => handleRemoveUser(user)}
                  deleteIcon={<DeleteIcon />}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Allowed IP Addresses (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Restrict access to specific IP addresses. Leave empty to allow all IPs.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="IP Address (e.g., 192.168.1.1)"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddIP()}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddIP}
              disabled={!newIP.trim()}
            >
              Add
            </Button>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {formData.allowedIPs.map((ip) => (
              <Chip
                key={ip}
                label={ip}
                onDelete={() => handleRemoveIP(ip)}
                deleteIcon={<DeleteIcon />}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave} size="large">
            Save Configuration
          </Button>
        </Box>
      </Paper>

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

export default GuardsPage;