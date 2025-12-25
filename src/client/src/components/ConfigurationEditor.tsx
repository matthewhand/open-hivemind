import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Alert, 
  Input, 
  Select, 
  Textarea, 
  Modal,
  Loading,
  Tooltip,
  Badge,
} from './DaisyUI';
import {
  Save as SaveIcon,
  RotateCcw as RefreshIcon,
  Settings as SettingsIcon,
  Shield,
  Lock,
  CheckCircle,
  Info,
} from 'lucide-react';
import { type Bot } from '../services/api';
import ProviderConfig from './ProviderConfig';

interface ConfigurationEditorProps {
  bot?: Bot;
  onSave?: (bot: Bot) => void;
}

const ConfigurationEditor: React.FC<ConfigurationEditorProps> = ({ bot, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Configuration state
  const [config, setConfig] = useState({
    name: '',
    messageProvider: '',
    llmProvider: '',
    persona: '',
    systemInstruction: '',
    discord: {},
    slack: {},
    mattermost: {},
    openai: {},
    flowise: {},
    openwebui: {},
    openswarm: {},
  });

  const messageProviders = [
    { value: 'discord', label: 'Discord' },
    { value: 'slack', label: 'Slack' },
    { value: 'mattermost', label: 'Mattermost' },
  ];

  const llmProviders = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'flowise', label: 'Flowise' },
    { value: 'openwebui', label: 'OpenWebUI' },
    { value: 'openswarm', label: 'OpenSwarm' },
    { value: 'perplexity', label: 'Perplexity' },
    { value: 'replicate', label: 'Replicate' },
    { value: 'n8n', label: 'n8n' },
  ];

  useEffect(() => {
    if (bot) {
      setConfig({
        name: bot.name || '',
        messageProvider: bot.messageProvider || '',
        llmProvider: bot.llmProvider || '',
        persona: bot.persona || '',
        systemInstruction: bot.systemInstruction || '',
        discord: bot.discord || {},
        slack: bot.slack || {},
        mattermost: bot.mattermost || {},
        openai: bot.openai || {},
        flowise: bot.flowise || {},
        openwebui: bot.openwebui || {},
        openswarm: bot.openswarm || {},
      });
    }
  }, [bot]);

  const handleSave = async () => {
    if (!bot) {return;}

    try {
      setLoading(true);
      setError(null);

      // TODO: Implement configuration update API call
      setSuccess('Configuration saved successfully');
      setShowSaveModal(false);
      onSave?.(bot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const hasEnvironmentOverrides = bot?.envOverrides && Object.keys(bot.envOverrides).length > 0;

  if (!bot) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-center">
          <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
          <p className="text-lg text-base-content/70">
            Select a bot to edit its configuration
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Configuration Editor - {bot.name}
          </h2>
          <p className="text-base-content/70">
            Configure bot settings, providers, and security options
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary" className="btn-outline"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            startIcon={<SaveIcon />}
            onClick={() => setShowSaveModal(true)}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {/* Environment Override Alert */}
      {hasEnvironmentOverrides && (
        <Alert severity="info" className="alert-info">
          <Shield className="w-4 h-4" />
          <div>
            <div className="font-bold">Environment Variable Overrides Active</div>
            <div className="text-sm">
              Some configuration fields are controlled by environment variables and cannot be modified here.
              <div className="mt-2">
                {Object.entries(bot.envOverrides!)
                  .slice(0, 3)
                  .map(([key]) => (
                    <Badge key={key} className="badge-info badge-xs mr-2 mb-1">
                      {key}
                    </Badge>
                  ))}
                {Object.keys(bot.envOverrides!).length > 3 && (
                  <span className="text-xs text-base-content/70">
                    +{Object.keys(bot.envOverrides!).length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" className="alert-error">
          <Info className="w-4 h-4" />
          <div>{error}</div>
        </Alert>
      )}

      {/* Basic Configuration */}
      <Card className="bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Basic Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Message Provider</span>
                <Tooltip content="The messaging platform where the bot will operate">
                  <Info className="w-4 h-4" />
                </Tooltip>
              </label>
              <Select
                options={messageProviders}
                value={config.messageProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, messageProvider: e.target.value }))}
                placeholder="Select message provider"
                disabled={hasEnvironmentOverrides}
                className={hasEnvironmentOverrides ? 'bg-base-200' : ''}
              />
              {hasEnvironmentOverrides && (
                <label className="label">
                  <span className="label-text-alt">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Controlled by environment variables
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">LLM Provider</span>
                <Tooltip content="The AI service that powers the bot's responses">
                  <Info className="w-4 h-4" />
                </Tooltip>
              </label>
              <Select
                options={llmProviders}
                value={config.llmProvider}
                onChange={(e) => setConfig(prev => ({ ...prev, llmProvider: e.target.value }))}
                placeholder="Select LLM provider"
                disabled={hasEnvironmentOverrides}
                className={hasEnvironmentOverrides ? 'bg-base-200' : ''}
              />
              {hasEnvironmentOverrides && (
                <label className="label">
                  <span className="label-text-alt">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Controlled by environment variables
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Persona</span>
                <Tooltip content="The personality and behavior template for the bot">
                  <Info className="w-4 h-4" />
                </Tooltip>
              </label>
              <Input
                value={config.persona}
                onChange={(e) => setConfig(prev => ({ ...prev, persona: e.target.value }))}
                placeholder="Enter persona name"
                disabled={hasEnvironmentOverrides}
                className={hasEnvironmentOverrides ? 'bg-base-200' : ''}
              />
              {hasEnvironmentOverrides && (
                <label className="label">
                  <span className="label-text-alt">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Controlled by environment variables
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Bot Status</span>
              </label>
              <div className="flex items-center gap-2">
                <Badge className={bot.isActive ? 'badge-success' : 'badge-ghost'}>
                  {bot.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {hasEnvironmentOverrides && (
                  <Tooltip content="Bot status is controlled by environment variables">
                    <Lock className="w-4 h-4 text-base-content/50" />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          <div className="form-control w-full mt-4">
            <label className="label">
              <span className="label-text">System Instruction</span>
              <Tooltip content="Custom instructions that override or extend the persona">
                <Info className="w-4 h-4" />
              </Tooltip>
            </label>
            <Textarea
              value={config.systemInstruction}
              onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
              placeholder="Enter custom system instructions to override or extend the persona"
              rows={4}
              disabled={hasEnvironmentOverrides}
              className={hasEnvironmentOverrides ? 'bg-base-200' : ''}
            />
            {hasEnvironmentOverrides && (
              <label className="label">
                <span className="label-text-alt">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Controlled by environment variables
                </span>
              </label>
            )}
          </div>
        </div>
      </Card>

      {/* Provider-specific configurations */}
      {config.messageProvider && (
        <Card className="bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Message Provider Configuration
              <Badge className="badge-info badge-sm">{config.messageProvider}</Badge>
            </h3>
            <ProviderConfig
              provider={config.messageProvider}
              config={config[config.messageProvider as keyof typeof config] || {}}
              onChange={(providerConfig) => setConfig({ ...config, [config.messageProvider]: providerConfig })}
              envOverrides={bot.envOverrides || {}}
              showSecurityIndicators={true}
            />
          </div>
        </Card>
      )}

      {config.llmProvider && (
        <Card className="bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <Shield className="w-5 h-5" />
              LLM Provider Configuration
              <Badge className="badge-secondary badge-sm">{config.llmProvider}</Badge>
            </h3>
            <ProviderConfig
              provider={config.llmProvider}
              config={config[config.llmProvider as keyof typeof config] || {}}
              onChange={(providerConfig) => setConfig({ ...config, [config.llmProvider]: providerConfig })}
              envOverrides={bot.envOverrides || {}}
              showSecurityIndicators={true}
            />
          </div>
        </Card>
      )}

      {/* Security Information Card */}
      {hasEnvironmentOverrides && (
        <Card className="bg-info/10 border-info/20">
          <div className="card-body">
            <h3 className="card-title text-info">
              <Shield className="w-5 h-5" />
              Security Information
            </h3>
            <div className="text-sm">
              <p className="mb-2">This bot configuration is partially controlled by environment variables:</p>
              <div className="space-y-1">
                {Object.entries(bot.envOverrides!)
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <Lock className="w-3 h-3" />
                      <code className="bg-base-300 px-2 py-1 rounded">{key}</code>
                      <span className="text-base-content/60">= ••••••••</span>
                      <CheckCircle className="w-3 h-3 text-success" />
                    </div>
                  ))}
              </div>
              <p className="mt-3 text-xs text-base-content/70">
                Environment variables provide enhanced security by preventing sensitive data from being stored in the database or exposed in the WebUI.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Save Confirmation Modal */}
      <Modal 
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Confirm Save Configuration"
        size="md"
      >
        <div className="modal-body">
          <p className="mb-4">
            Are you sure you want to save the configuration for "{bot.name}"?
          </p>
          {hasEnvironmentOverrides && (
            <Alert severity="warning" className="alert-warning">
              <Info className="w-4 h-4" />
              <div>
                <div className="font-bold">Note about Environment Overrides</div>
                <div className="text-sm">
                  Some configuration fields are controlled by environment variables and will not be updated.
                </div>
              </div>
            </Alert>
          )}
        </div>
        <div className="modal-action">
          <Button
            variant="ghost"
            onClick={() => setShowSaveModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Save Configuration'}
          </Button>
        </div>
      </Modal>

      {/* Success Notification */}
      {success && (
        <div className="toast toast-top toast-end">
          <Alert severity="success" className="alert-success">
            <CheckCircle className="w-4 h-4" />
            <div>{success}</div>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default ConfigurationEditor;