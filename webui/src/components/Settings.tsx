import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  toggleTheme, 
  toggleAutoRefresh, 
  setRefreshInterval, 
  selectUIState 
} from '../store/slices/uiSlice';
import LoadingSpinner from './LoadingSpinner';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUIState);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleAutoRefreshToggle = () => {
    dispatch(toggleAutoRefresh());
  };

  const handleRefreshIntervalChange = (interval: number) => {
    dispatch(setRefreshInterval(interval));
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    // Simulate API call
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  if (ui.isLoading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {saveStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={ui.theme === 'dark'}
                onChange={handleThemeToggle}
                color="primary"
              />
            }
            label="Dark Mode"
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Theme: {ui.theme}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Dashboard Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={ui.isAutoRefresh}
                onChange={handleAutoRefreshToggle}
                color="primary"
              />
            }
            label="Auto Refresh"
          />
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Refresh Interval:
            </Typography>
            <Select
              value={ui.refreshInterval}
              onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
              size="small"
              sx={{ minWidth: 120 }}
              disabled={!ui.isAutoRefresh}
            >
              <MenuItem value={1000}>1 second</MenuItem>
              <MenuItem value={5000}>5 seconds</MenuItem>
              <MenuItem value={10000}>10 seconds</MenuItem>
              <MenuItem value={30000}>30 seconds</MenuItem>
              <MenuItem value={60000}>1 minute</MenuItem>
            </Select>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Accessibility
          </Typography>
          
          <FormControlLabel
            control={<Switch checked={ui.highContrast} color="primary" />}
            label="High Contrast Mode"
          />
          
          <FormControlLabel
            control={<Switch checked={ui.reducedMotion} color="primary" />}
            label="Reduced Motion"
          />
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSaveSettings}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
        >
          Reset to Defaults
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;