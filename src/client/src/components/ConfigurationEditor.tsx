import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Input, Select } from './DaisyUI';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { type Bot } from '../services/api';

interface ConfigurationEditorProps {
  bot?: Bot;
  onSave?: (bot: Bot) => void;
}

const ConfigurationEditor: React.FC<ConfigurationEditorProps> = ({ bot, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Configuration state
  const [config, setConfig] = useState({
    messageProvider: '',
    llmProvider: '',
    persona: '',
    systemInstruction: '',
  });

  const messageProviders = ['discord', 'slack', 'mattermost'];
  const llmProviders = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];

  useEffect(() => {
    if (bot) {
      setConfig({
        messageProvider: bot.messageProvider || '',
        llmProvider: bot.llmProvider || '',
        persona: bot.persona || '',
        systemInstruction: bot.systemInstruction || '',
      });
    }
  }, [bot]);

  const handleSave = async () => {
    if (!bot) return;

    try {
      setLoading(true);
      setError(null);

      // TODO: Implement configuration update API call
      setSnackbar({ open: true, message: 'Configuration saved successfully', severity: 'success' });
      onSave?.(bot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to save configuration',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!bot) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography variant="body1" color="text.secondary">
          Select a bot to edit its configuration
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Configuration Editor - {bot.name}
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Save Configuration'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Basic Configuration
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Message Provider</span>
              </label>
              <Select
                options={messageProviders.map(provider => ({
                  value: provider,
                  label: provider.charAt(0).toUpperCase() + provider.slice(1)
                }))}
                value={config.messageProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, messageProvider: e.target.value }))}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">LLM Provider</span>
              </label>
              <Select
                options={llmProviders.map(provider => ({
                  value: provider,
                  label: provider.charAt(0).toUpperCase() + provider.slice(1)
                }))}
                value={config.llmProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, llmProvider: e.target.value }))}
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Persona</span>
              </label>
              <Input
                value={config.persona}
                onChange={(e) => setConfig(prev => ({ ...prev, persona: e.target.value }))}
                placeholder="Enter persona"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">System Instruction</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                value={config.systemInstruction}
                onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                placeholder="Enter system instruction"
              />
            </div>
          </Box>
        </CardContent>
      </Card>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Advanced Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary">
            Advanced configuration options will be available here in a future update.
          </Typography>
        </AccordionDetails>
      </Accordion>

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
    </Box>
  );
};

export default ConfigurationEditor;