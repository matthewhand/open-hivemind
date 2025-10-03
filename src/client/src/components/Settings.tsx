import React, { useEffect, useRef, useState } from 'react';
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
  FormControl,
  InputLabel,
} from '@mui/material';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  selectUI,
  setAnimationsEnabled,
  setRefreshInterval,
  setShowKeyboardShortcuts,
  setShowTooltips,
  setTheme,
  toggleAutoRefresh,
} from '../store/slices/uiSlice';
import type { UIState } from '../store/slices/uiSlice';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const ui = useAppSelector(selectUI);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const themeOptions: Array<{ value: UIState['theme']; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'high-contrast', label: 'High Contrast' },
    { value: 'auto', label: 'Auto (System)' },
  ];

  const handleThemeToggle = (checked: boolean) => {
    dispatch(setTheme(checked ? 'dark' : 'light'));
  };

  const handleThemeSelect = (mode: UIState['theme']) => {
    dispatch(setTheme(mode));
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
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
      resetTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
  }, []);

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
                onChange={(event) => handleThemeToggle(event.target.checked)}
                color="primary"
              />
            }
            label="Dark Mode"
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Theme preset
          </Typography>
          <Select
            value={ui.theme}
            onChange={(event) => handleThemeSelect(event.target.value as UIState['theme'])}
            size="small"
            sx={{ minWidth: 200 }}
            aria-label="Theme preset selection"
          >
            {themeOptions.map(option => (
              <MenuItem
                key={option.value}
                value={option.value}
                aria-label={`Theme option ${option.label}`}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <Box mt={2} display="flex" alignItems="center" gap={2} aria-label="Theme preview">
            <Box
              sx={(theme) => ({
                width: 72,
                height: 40,
                borderRadius: 1,
                bgcolor: theme.palette.background.default,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1,
              })}
              role="img"
              aria-label={`Current theme preview (${ui.theme})`}
            />
            <Typography variant="caption" color="text.secondary">
              Live preview of current theme. High Contrast maximizes legibility. Auto follows system preference.
            </Typography>
          </Box>
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
                checked={ui.autoRefreshEnabled}
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
              disabled={!ui.autoRefreshEnabled}
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
          
          <Box mb={1.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={!ui.animationsEnabled}
                  onChange={(event) => dispatch(setAnimationsEnabled(!event.target.checked))}
                  color="primary"
                  inputProps={{ 'aria-label': 'Toggle reduced motion preference' }}
                />
              }
              label="Reduced Motion"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 6 }}>
              Minimizes interface animations to reduce motion fatigue and improve focus.
            </Typography>
          </Box>
          
          <Box mb={1.5}>
            <FormControlLabel
              control={
                <Switch
                  checked={ui.showTooltips}
                  onChange={(event) => dispatch(setShowTooltips(event.target.checked))}
                  color="primary"
                  inputProps={{ 'aria-label': 'Toggle tooltips visibility' }}
                />
              }
              label="Show Tooltips"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 6 }}>
              Provides contextual help on hover/focus. Disable for a cleaner interface.
            </Typography>
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={ui.showKeyboardShortcuts}
                  onChange={(event) => dispatch(setShowKeyboardShortcuts(event.target.checked))}
                  color="primary"
                  inputProps={{ 'aria-label': 'Toggle keyboard shortcuts overlay' }}
                />
              }
              label="Keyboard Shortcuts Overlay"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 6 }}>
              Shows an on-demand reference panel to improve efficiency for power users.
            </Typography>
          </Box>
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
