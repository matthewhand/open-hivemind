import React, { useState } from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Button, Divider, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { Alert } from '../DaisyUI';

const SettingsSecurity: React.FC = () => {
  const [settings, setSettings] = useState({
    enableAuthentication: true,
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    lockoutDuration: 900,
    enableTwoFactor: false,
    enableAuditLogging: true,
    enableRateLimit: true,
    rateLimitWindow: 60,
    rateLimitMax: 100,
    enableCors: true,
    corsOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
    enableSecurityHeaders: true,
    enableApiKeyAuth: true
  });
  const [newOrigin, setNewOrigin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOrigin = () => {
    if (newOrigin && !settings.corsOrigins.includes(newOrigin)) {
      setSettings(prev => ({
        ...prev,
        corsOrigins: [...prev.corsOrigins, newOrigin]
      }));
      setNewOrigin('');
    }
  };

  const handleRemoveOrigin = (origin: string) => {
    setSettings(prev => ({
      ...prev,
      corsOrigins: prev.corsOrigins.filter(o => o !== origin)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAlert({ type: 'success', message: 'Security settings saved successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save security settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Security Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure authentication, authorization, and security policies
      </Typography>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
        {/* Authentication */}
        <Typography variant="h6">Authentication</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableAuthentication}
              onChange={(e) => handleChange('enableAuthentication', e.target.checked)}
            />
          }
          label="Enable user authentication"
        />

        <TextField
          label="Session Timeout (seconds)"
          type="number"
          value={settings.sessionTimeout}
          onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
          fullWidth
          disabled={!settings.enableAuthentication}
          helperText="How long user sessions remain active"
          inputProps={{ min: 300, max: 86400 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableTwoFactor}
              onChange={(e) => handleChange('enableTwoFactor', e.target.checked)}
              disabled={!settings.enableAuthentication}
            />
          }
          label="Enable two-factor authentication"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableApiKeyAuth}
              onChange={(e) => handleChange('enableApiKeyAuth', e.target.checked)}
            />
          }
          label="Enable API key authentication"
        />

        <Divider />

        {/* Brute Force Protection */}
        <Typography variant="h6">Brute Force Protection</Typography>

        <TextField
          label="Max Login Attempts"
          type="number"
          value={settings.maxLoginAttempts}
          onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
          fullWidth
          helperText="Number of failed attempts before account lockout"
          inputProps={{ min: 3, max: 20 }}
        />

        <TextField
          label="Lockout Duration (seconds)"
          type="number"
          value={settings.lockoutDuration}
          onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value))}
          fullWidth
          helperText="How long accounts remain locked after too many failed attempts"
          inputProps={{ min: 60, max: 3600 }}
        />

        <Divider />

        {/* Rate Limiting */}
        <Typography variant="h6">Rate Limiting</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableRateLimit}
              onChange={(e) => handleChange('enableRateLimit', e.target.checked)}
            />
          }
          label="Enable API rate limiting"
        />

        <TextField
          label="Rate Limit Window (seconds)"
          type="number"
          value={settings.rateLimitWindow}
          onChange={(e) => handleChange('rateLimitWindow', parseInt(e.target.value))}
          fullWidth
          disabled={!settings.enableRateLimit}
          helperText="Time window for rate limit calculations"
          inputProps={{ min: 10, max: 3600 }}
        />

        <TextField
          label="Max Requests per Window"
          type="number"
          value={settings.rateLimitMax}
          onChange={(e) => handleChange('rateLimitMax', parseInt(e.target.value))}
          fullWidth
          disabled={!settings.enableRateLimit}
          helperText="Maximum requests allowed per time window"
          inputProps={{ min: 10, max: 10000 }}
        />

        <Divider />

        {/* CORS Configuration */}
        <Typography variant="h6">CORS Configuration</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableCors}
              onChange={(e) => handleChange('enableCors', e.target.checked)}
            />
          }
          label="Enable CORS (Cross-Origin Resource Sharing)"
        />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            label="Add Allowed Origin"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            placeholder="https://example.com"
            disabled={!settings.enableCors}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="outlined"
            onClick={handleAddOrigin}
            disabled={!settings.enableCors || !newOrigin}
            startIcon={<AddIcon />}
          >
            Add
          </Button>
        </Box>

        <Paper sx={{ mt: 2 }}>
          <List dense>
            {settings.corsOrigins.map((origin, index) => (
              <ListItem key={index}>
                <ListItemText primary={origin} />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={!settings.enableCors}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Divider />

        {/* Security Headers */}
        <Typography variant="h6">Security Headers</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableSecurityHeaders}
              onChange={(e) => handleChange('enableSecurityHeaders', e.target.checked)}
            />
          }
          label="Enable security headers (HSTS, CSP, X-Frame-Options, etc.)"
        />

        <Divider />

        {/* Audit Logging */}
        <Typography variant="h6">Audit Logging</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableAuditLogging}
              onChange={(e) => handleChange('enableAuditLogging', e.target.checked)}
            />
          }
          label="Enable audit logging for security events"
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            size="large"
          >
            {isSaving ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsSecurity;