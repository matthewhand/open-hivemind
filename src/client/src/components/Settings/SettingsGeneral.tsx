/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Input, Select, Toggle, Button } from '../DaisyUI';
import { Settings, Globe, Bell, FileText, Server } from 'lucide-react';
import { apiService } from '../../services/api';

interface GeneralConfig {
  instanceName: string;
  description: string;
  timezone: string;
  language: string;
  theme: string;
  enableNotifications: boolean;
  enableLogging: boolean;
  logLevel: string;
  maxConcurrentBots: number;
  defaultResponseTimeout: number;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  advancedMode: boolean;
}

const SettingsGeneral: React.FC = () => {
  const [settings, setSettings] = useState<GeneralConfig>({
    instanceName: '',
    description: '',
    timezone: 'UTC',
    language: 'en',
    theme: 'auto',
    enableNotifications: true,
    enableLogging: true,
    logLevel: 'info',
    maxConcurrentBots: 10,
    defaultResponseTimeout: 30,
    enableHealthChecks: true,
    healthCheckInterval: 60,
    advancedMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getGlobalConfig();

      // Extract relevant settings from user-saved config first, then fall back to defaults
      const userSettings = data._userSettings?.values || {};
      const config = data.config || {};

      setSettings({
        instanceName: userSettings['app.name'] || config.app?.name?.value || 'Open-Hivemind Instance',
        description: userSettings['app.description'] || config.app?.description?.value || 'Multi-agent AI coordination platform',
        timezone: userSettings['app.timezone'] || config.app?.timezone?.value || 'UTC',
        language: userSettings['app.language'] || config.app?.language?.value || 'en',
        theme: userSettings['webui.theme'] || config.webui?.theme?.value || 'auto',
        enableNotifications: userSettings['webui.notifications'] ?? (config.webui?.notifications?.value !== false),
        enableLogging: userSettings['logging.enabled'] ?? (config.logging?.enabled?.value !== false),
        logLevel: userSettings['logging.level'] || config.logging?.level?.value || 'info',
        maxConcurrentBots: userSettings['limits.maxBots'] || config.limits?.maxBots?.value || 10,
        defaultResponseTimeout: userSettings['limits.timeout'] || config.limits?.timeout?.value || 30,
        enableHealthChecks: userSettings['health.enabled'] ?? (config.health?.enabled?.value !== false),
        healthCheckInterval: userSettings['health.interval'] || config.health?.interval?.value || 60,
        advancedMode: userSettings['webui.advancedMode'] || false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setAlert({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setAlert(null);
    try {
      await apiService.updateGlobalConfig({
        'app.name': settings.instanceName,
        'app.description': settings.description,
        'app.timezone': settings.timezone,
        'webui.theme': settings.theme,
        'logging.level': settings.logLevel,
        'logging.enabled': settings.enableLogging,
        'webui.notifications': settings.enableNotifications,
        'limits.maxBots': settings.maxConcurrentBots,
        'limits.timeout': settings.defaultResponseTimeout,
        'health.enabled': settings.enableHealthChecks,
        'health.interval': settings.healthCheckInterval,
        'webui.advancedMode': settings.advancedMode,
      });

      setAlert({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setAlert({ type: 'error', message: 'Failed to save settings. Check permissions.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">General Configuration</h2>
          <p className="text-sm text-base-content/70">Manage core instance settings</p>
        </div>
      </div>

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instance Info */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              Instance Information
            </h3>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Instance Name</span>
              </label>
              <Input
                value={settings.instanceName}
                onChange={(e) => handleChange('instanceName', e.target.value)}
                placeholder="My Hivemind Instance"
                className="input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                value={settings.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Instance description..."
              />
            </div>
          </div>
        </div>

        {/* Localization & Appearance */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-secondary" />
              Localization & Theme
            </h3>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Timezone</span>
              </label>
              <Select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                options={[
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'Eastern Time (US)' },
                  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
                  { value: 'Europe/London', label: 'London' },
                  { value: 'Asia/Tokyo', label: 'Tokyo' },
                  { value: 'Australia/Sydney', label: 'Sydney' },
                ]}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Theme</span>
              </label>
              <Select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                options={[
                  { value: 'auto', label: 'Auto (System)' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Logging & Notifications */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-accent" />
              System Logging
            </h3>

            <div className="form-control mb-4">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.enableLogging}
                  onChange={(e) => handleChange('enableLogging', e.target.checked)}
                  color="accent"
                />
                <span className="label-text font-medium">Enable Logging</span>
              </label>
            </div>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-medium">Log Level</span>
              </label>
              <Select
                value={settings.logLevel}
                onChange={(e) => handleChange('logLevel', e.target.value)}
                disabled={!settings.enableLogging}
                options={[
                  { value: 'debug', label: 'Debug' },
                  { value: 'info', label: 'Info' },
                  { value: 'warn', label: 'Warning' },
                  { value: 'error', label: 'Error' },
                ]}
              />
            </div>

            <h3 className="card-title text-base flex items-center gap-2 mb-2 pt-2 border-t border-base-200">
              <Bell className="w-4 h-4 text-warning" />
              Notifications
            </h3>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.enableNotifications}
                  onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                  color="warning"
                />
                <span className="label-text font-medium">Enable System Notifications</span>
              </label>
            </div>
          </div>
        </div>

        {/* System Limits */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-error" />
              System Limits
            </h3>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-medium">Max Concurrent Bots</span>
                <span className="badge badge-primary font-mono">{settings.maxConcurrentBots}</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.maxConcurrentBots}
                onChange={(e) => handleChange('maxConcurrentBots', parseInt(e.target.value))}
                className="range range-primary range-sm"
              />
              <div className="w-full flex justify-between text-xs px-2 mt-1 opacity-50">
                <span>1</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-medium">Response Timeout (sec)</span>
                <span className="badge badge-secondary font-mono">{settings.defaultResponseTimeout}s</span>
              </label>
              <input
                type="range"
                min="5"
                max="120"
                value={settings.defaultResponseTimeout}
                onChange={(e) => handleChange('defaultResponseTimeout', parseInt(e.target.value))}
                className="range range-secondary range-sm"
              />
              <div className="w-full flex justify-between text-xs px-2 mt-1 opacity-50">
                <span>5s</span>
                <span>60s</span>
                <span>120s</span>
              </div>
            </div>

            <div className="bg-base-200 rounded-lg p-3 text-xs opacity-70 mt-auto">
                <p>
                    <strong>Advanced Mode:</strong> {settings.advancedMode ? 'Enabled' : 'Disabled'}
                </p>
                <div className="form-control mt-2">
                    <label className="label cursor-pointer justify-start gap-2 p-0">
                        <input
                            type="checkbox"
                            className="toggle toggle-xs"
                            checked={settings.advancedMode}
                            onChange={(e) => handleChange('advancedMode', e.target.checked)}
                        />
                        <span className="label-text text-xs">Toggle Advanced Features</span>
                    </label>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-base-200">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          loading={isSaving}
          className="gap-2"
        >
          {isSaving ? 'Saving...' : 'Save General Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsGeneral;
