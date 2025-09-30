import React, { useState, useEffect } from 'react';
import { Button, Card, Select, Tabs, TextInput, Textarea, Toggle } from './DaisyUI';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
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
    enabled: true,
    debugMode: false,
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
        enabled: bot.enabled ?? true,
        debugMode: bot.debugMode ?? false,
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
      <div className="flex justify-center items-center min-h-[200px]">
        <p className="text-base-content/70">
          Select a bot to edit its configuration
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          Configuration Editor - {bot.name}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            icon={<RefreshIcon />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={loading}
            icon={<SaveIcon />}
            loadingText="Saving..."
          >
            Save Configuration
          </Button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <Tabs
        tabs={[
          {
            id: 'basic',
            title: 'Basic Configuration',
            content: (
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Basic Configuration
                  </h3>
                  <div className="flex flex-col gap-4">
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

                    <TextInput
                      label="Persona"
                      value={config.persona}
                      onChange={(e) => setConfig(prev => ({ ...prev, persona: e.target.value }))}
                      placeholder="Enter persona"
                    />

                    <Textarea
                      label="System Instruction"
                      value={config.systemInstruction}
                      onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                      placeholder="Enter system instruction"
                      rows={3}
                      resizable="vertical"
                    />
                    <Toggle
                      id="bot-enabled"
                      label="Enable Bot"
                      checked={config.enabled}
                      onChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
                      helperText="Toggle the bot on or off"
                    />
                    <Toggle
                      id="debug-mode"
                      label="Debug Mode"
                      checked={config.debugMode}
                      onChange={(checked) => setConfig(prev => ({ ...prev, debugMode: checked }))}
                      helperText="Enable debug mode for detailed logging"
                    />
                  </div>
                </div>
              </Card>
            )
          },
          {
            id: 'advanced',
            title: 'Advanced Settings',
            content: (
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">Advanced Settings</h3>
                  <p className="text-base-content/70">
                    Advanced configuration options will be available here in a future update.
                  </p>
                </div>
              </Card>
            )
          },
          {
            id: 'mcp',
            title: 'MCP Configuration',
            content: (
              <Card>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">MCP Configuration</h3>
                  <p className="text-base-content/70">
                    MCP configuration options will be available here in a future update.
                  </p>
                </div>
              </Card>
            )
          }
        ]}
        variant="bordered"
      />

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <div className="toast toast-end">
          <div className={`alert alert-${snackbar.severity}`}>
            <div>
              <span>{snackbar.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationEditor;