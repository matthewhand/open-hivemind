import React, { useState } from 'react';
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Button, Divider } from '@mui/material';
import { Alert } from '../DaisyUI';

const SettingsGeneral: React.FC = () => {
  const [settings, setSettings] = useState({
    instanceName: 'Open-Hivemind Instance',
    description: 'Multi-agent AI coordination platform',
    timezone: 'UTC',
    language: 'en',
    theme: 'auto',
    enableNotifications: true,
    enableLogging: true,
    logLevel: 'info',
    maxConcurrentBots: 10,
    defaultResponseTimeout: 30,
    enableHealthChecks: true,
    healthCheckInterval: 60
  });
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAlert({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        General Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure basic instance settings and preferences
      </Typography>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
        {/* Instance Information */}
        <Typography variant="h6">Instance Information</Typography>
        
        <TextField
          label="Instance Name"
          value={settings.instanceName}
          onChange={(e) => handleChange('instanceName', e.target.value)}
          fullWidth
          helperText="Display name for this Open-Hivemind instance"
        />

        <TextField
          label="Description"
          value={settings.description}
          onChange={(e) => handleChange('description', e.target.value)}
          multiline
          rows={3}
          fullWidth
          helperText="Brief description of this instance's purpose"
        />

        <Divider />

        {/* Localization */}
        <Typography variant="h6">Localization</Typography>

        <FormControl fullWidth>
          <InputLabel>Timezone</InputLabel>
          <Select
            value={settings.timezone}
            label="Timezone"
            onChange={(e) => handleChange('timezone', e.target.value)}
          >
            <MenuItem value="UTC">UTC</MenuItem>
            <MenuItem value="America/New_York">Eastern Time</MenuItem>
            <MenuItem value="America/Chicago">Central Time</MenuItem>
            <MenuItem value="America/Denver">Mountain Time</MenuItem>
            <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
            <MenuItem value="Europe/London">London</MenuItem>
            <MenuItem value="Europe/Paris">Paris</MenuItem>
            <MenuItem value="Asia/Tokyo">Tokyo</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Language</InputLabel>
          <Select
            value={settings.language}
            label="Language"
            onChange={(e) => handleChange('language', e.target.value)}
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="es">Spanish</MenuItem>
            <MenuItem value="fr">French</MenuItem>
            <MenuItem value="de">German</MenuItem>
            <MenuItem value="ja">Japanese</MenuItem>
            <MenuItem value="zh">Chinese</MenuItem>
          </Select>
        </FormControl>

        <Divider />

        {/* Appearance */}
        <Typography variant="h6">Appearance</Typography>

        <FormControl fullWidth>
          <InputLabel>Theme</InputLabel>
          <Select
            value={settings.theme}
            label="Theme"
            onChange={(e) => handleChange('theme', e.target.value)}
          >
            <MenuItem value="auto">Auto (System)</MenuItem>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>

        <Divider />

        {/* System Behavior */}
        <Typography variant="h6">System Behavior</Typography>

        <TextField
          label="Max Concurrent Bots"
          type="number"
          value={settings.maxConcurrentBots}
          onChange={(e) => handleChange('maxConcurrentBots', parseInt(e.target.value))}
          fullWidth
          helperText="Maximum number of bots that can run simultaneously"
          inputProps={{ min: 1, max: 100 }}
        />

        <TextField
          label="Default Response Timeout (seconds)"
          type="number"
          value={settings.defaultResponseTimeout}
          onChange={(e) => handleChange('defaultResponseTimeout', parseInt(e.target.value))}
          fullWidth
          helperText="How long to wait for bot responses before timing out"
          inputProps={{ min: 5, max: 300 }}
        />

        <Divider />

        {/* Notifications & Logging */}
        <Typography variant="h6">Notifications & Logging</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
            />
          }
          label="Enable system notifications"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableLogging}
              onChange={(e) => handleChange('enableLogging', e.target.checked)}
            />
          }
          label="Enable system logging"
        />

        <FormControl fullWidth disabled={!settings.enableLogging}>
          <InputLabel>Log Level</InputLabel>
          <Select
            value={settings.logLevel}
            label="Log Level"
            onChange={(e) => handleChange('logLevel', e.target.value)}
          >
            <MenuItem value="debug">Debug</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warn">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>

        <Divider />

        {/* Health Monitoring */}
        <Typography variant="h6">Health Monitoring</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.enableHealthChecks}
              onChange={(e) => handleChange('enableHealthChecks', e.target.checked)}
            />
          }
          label="Enable automated health checks"
        />

        <TextField
          label="Health Check Interval (seconds)"
          type="number"
          value={settings.healthCheckInterval}
          onChange={(e) => handleChange('healthCheckInterval', parseInt(e.target.value))}
          fullWidth
          disabled={!settings.enableHealthChecks}
          helperText="How often to run health checks"
          inputProps={{ min: 10, max: 3600 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            size="large"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsGeneral;