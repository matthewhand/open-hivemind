import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Alert, Checkbox } from '../../../client/src/components/DaisyUI';
import { useSuccessToast, useErrorToast } from '../../../client/src/components/DaisyUI/ToastNotification';

interface DiscordConfig {
  botToken: string;
  clientId: string;
  guildId: string;
  prefix: string;
  status: 'idle' | 'dnd' | 'online' | 'invisible';
  activity?: {
    type: 'PLAYING' | 'STREAMING' | 'LISTENING' | 'WATCHING' | 'COMPETING';
    name: string;
  };
  features: {
    voiceSupport: boolean;
    messageLogging: boolean;
    autoModeration: boolean;
    analytics: boolean;
  };
}

const DiscordConfiguration: React.FC = () => {
  const [config, setConfig] = useState<DiscordConfig>({
    botToken: '',
    clientId: '',
    guildId: '',
    prefix: '!',
    status: 'online',
    features: {
      voiceSupport: true,
      messageLogging: false,
      autoModeration: false,
      analytics: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  useEffect(() => {
    // Load existing configuration
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // API call to load Discord configuration
      const response = await fetch('/api/integrations/discord/config');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setConfig(prev => ({ ...prev, ...data }));
        }
      }
    } catch (error) {
      console.error('Failed to load Discord config:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations/discord/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        successToast('Discord configuration saved successfully');
      } else {
        const error = await response.json();
        errorToast('Failed to save configuration', error.message);
      }
    } catch (error) {
      errorToast('Failed to save configuration', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/integrations/discord/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botToken: config.botToken, clientId: config.clientId }),
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.message
      });

      if (result.success) {
        successToast('Discord connection test successful');
      } else {
        errorToast('Discord connection test failed', result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({
        success: false,
        message
      });
      errorToast('Discord connection test failed', message);
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (path: string, value: unknown) => {
    setConfig(prev => {
      const keys = path.split('.');
      const newConfig = { ...prev };
      let current: Record<string, unknown> = newConfig as Record<string, unknown>;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-base-100 shadow-xl">
        <div className="card-body p-6">
          <div className="text-2xl font-bold mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#5865F2] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              Discord Integration
            </div>
          </div>

          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Bot Token</span>
                <span className="label-text-alt text-xs text-base-content/60">Required</span>
              </label>
              <Input
                type="password"
                placeholder="Enter Discord bot token"
                value={config.botToken}
                onChange={(e) => updateConfig('botToken', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Client ID</span>
                <span className="label-text-alt text-xs text-base-content/60">Required</span>
              </label>
              <Input
                type="text"
                placeholder="Enter Discord client ID"
                value={config.clientId}
                onChange={(e) => updateConfig('clientId', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Guild ID (Server)</span>
                <span className="label-text-alt text-xs text-base-content/60">Optional</span>
              </label>
              <Input
                type="text"
                placeholder="Enter Discord guild ID"
                value={config.guildId}
                onChange={(e) => updateConfig('guildId', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Command Prefix</span>
                <span className="label-text-alt text-xs text-base-content/60">Default: !</span>
              </label>
              <Input
                type="text"
                placeholder="Command prefix"
                value={config.prefix}
                onChange={(e) => updateConfig('prefix', e.target.value)}
                className="w-full"
                maxLength={5}
              />
            </div>
          </div>

          <div className="divider my-6">Bot Status & Activity</div>

          {/* Status Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Bot Status</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={config.status}
                onChange={(e) => updateConfig('status', e.target.value)}
              >
                <option value="online">🟢 Online</option>
                <option value="idle">🟡 Idle</option>
                <option value="dnd">🔴 Do Not Disturb</option>
                <option value="invisible">⚫ Invisible</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Activity Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={config.activity?.type || 'PLAYING'}
                onChange={(e) => updateConfig('activity.type', e.target.value)}
              >
                <option value="PLAYING">🎮 Playing</option>
                <option value="STREAMING">📺 Streaming</option>
                <option value="LISTENING">🎵 Listening</option>
                <option value="WATCHING">👀 Watching</option>
                <option value="COMPETING">⚔️ Competing</option>
              </select>
            </div>

            <div className="form-control w-full md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Activity Name</span>
              </label>
              <Input
                type="text"
                placeholder="What the bot is doing"
                value={config.activity?.name || ''}
                onChange={(e) => updateConfig('activity.name', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="divider my-6">Features</div>

          {/* Features Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">🎤 Voice Support</span>
                <Checkbox
                  checked={config.features.voiceSupport}
                  onChange={(e) => updateConfig('features.voiceSupport', e.target.checked)}
                  className="checkbox-primary"
                />
              </label>
              <label className="label">
                <span className="label-text-alt text-xs">Enable voice channels and audio processing</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">📝 Message Logging</span>
                <Checkbox
                  checked={config.features.messageLogging}
                  onChange={(e) => updateConfig('features.messageLogging', e.target.checked)}
                  className="checkbox-primary"
                />
              </label>
              <label className="label">
                <span className="label-text-alt text-xs">Log messages for analytics</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">🛡️ Auto Moderation</span>
                <Checkbox
                  checked={config.features.autoModeration}
                  onChange={(e) => updateConfig('features.autoModeration', e.target.checked)}
                  className="checkbox-primary"
                />
              </label>
              <label className="label">
                <span className="label-text-alt text-xs">Enable automatic content moderation</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">📊 Analytics</span>
                <Checkbox
                  checked={config.features.analytics}
                  onChange={(e) => updateConfig('features.analytics', e.target.checked)}
                  className="checkbox-primary"
                />
              </label>
              <label className="label">
                <span className="label-text-alt text-xs">Track server statistics</span>
              </label>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`mb-6 alert ${testResult.success ? 'alert-success' : 'alert-error'}`}>
              <div className="flex items-center gap-3">
                <span>{testResult.success ? '✅' : '❌'}</span>
                <div>
                  <div className="font-medium">
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </div>
                  <div className="text-sm opacity-80">{testResult.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={saveConfig}
              loading={loading}
              disabled={!config.botToken || !config.clientId}
            >
              Save Configuration
            </Button>

            <Button
              variant="secondary"
              onClick={testConnection}
              loading={testing}
              disabled={!config.botToken || !config.clientId}
            >
              Test Connection
            </Button>

            <Button
              variant="ghost"
              onClick={loadConfig}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DiscordConfiguration;