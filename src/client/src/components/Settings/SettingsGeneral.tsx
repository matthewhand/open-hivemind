/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Input, Select, Toggle, Button, Divider } from '../DaisyUI';
import { Settings as SettingsIcon } from 'lucide-react';

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
  const [screensaverEnabled, setScreensaverEnabled] = useState(true);

  // Load screensaver preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hivemind-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.screensaver === 'boolean') {
          setScreensaverEnabled(parsed.screensaver);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleScreensaverToggle = (enabled: boolean) => {
    setScreensaverEnabled(enabled);
    let currentSettings = {};
    try {
      currentSettings = JSON.parse(localStorage.getItem('hivemind-settings') || '{}');
    } catch (e) {
      // ignore
    }
    const newSettings = { ...currentSettings, screensaver: enabled };
    localStorage.setItem('hivemind-settings', JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent('hivemind-settings-updated', { detail: newSettings }));
  };

  // Generate timezone options dynamically
  const timezoneOptions = useMemo(() => {
    try {
      // @ts-ignore - Intl.supportedValuesOf is available in modern environments
      if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
        // @ts-ignore
        const timezones = Intl.supportedValuesOf('timeZone');
        return timezones.map((tz: string) => ({
          value: tz,
          label: tz.replace(/_/g, ' '),
        }));
      }
    } catch (e) {
      console.warn('Failed to load timezones:', e);
    }
    // Fallback options
    return [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'Eastern Time' },
      { value: 'America/Los_Angeles', label: 'Pacific Time' },
      { value: 'Europe/London', label: 'London' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Australia/Sydney', label: 'Sydney' },
    ];
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/global');
      if (!response.ok) { throw new Error('Failed to fetch settings'); }
      const data = await response.json();

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
    try {
      const response = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'app.name': settings.instanceName,
          'app.description': settings.description,
          'logging.level': settings.logLevel,
          'logging.enabled': settings.enableLogging,
          'webui.advancedMode': settings.advancedMode,
        }),
      });

      if (!response.ok) { throw new Error('Failed to save settings'); }
      setAlert({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save settings. Some settings may require environment variables.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <SettingsIcon className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">General Settings</h5>
          <p className="text-sm text-base-content/70">Configure basic instance settings and preferences</p>
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
        {/* Instance Information */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Instance Information
          </h6>

          <div className="form-control mb-4">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Instance Name</span>
            </label>
            <Input
              value={settings.instanceName}
              onChange={(e) => handleChange('instanceName', e.target.value)}
              placeholder="Display name for this Open-Hivemind instance"
              size="sm"
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              value={settings.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of this instance's purpose"
              rows={2}
            />
          </div>
        </div>

        {/* Localization */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full"></span>
            Localization & Appearance
          </h6>

          <div className="form-control mb-4">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Timezone</span>
            </label>
            <Select
              value={settings.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              size="sm"
              options={timezoneOptions}
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Theme</span>
            </label>
            <Select
              value={settings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              size="sm"
              options={[
                { value: 'auto', label: 'Auto (System)' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>

          <div className="form-control">
            <label className="label cursor-pointer py-1">
              <span className="label-text text-sm">Enable Screensaver</span>
              <Toggle
                checked={screensaverEnabled}
                onChange={(e) => handleScreensaverToggle(e.target.checked)}
                size="sm"
              />
            </label>
          </div>
        </div>

        {/* Logging */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            Logging & Notifications
          </h6>

          <div className="form-control mb-3">
            <label className="label cursor-pointer py-1">
              <span className="label-text text-sm">Enable system logging</span>
              <Toggle
                checked={settings.enableLogging}
                onChange={(e) => handleChange('enableLogging', e.target.checked)}
                size="sm"
              />
            </label>
          </div>

          <div className="form-control mb-3">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Log Level</span>
            </label>
            <Select
              value={settings.logLevel}
              onChange={(e) => handleChange('logLevel', e.target.value)}
              disabled={!settings.enableLogging}
              size="sm"
              options={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]}
            />
          </div>

          <div className="form-control">
            <label className="label cursor-pointer py-1">
              <span className="label-text text-sm">Enable notifications</span>
              <Toggle
                checked={settings.enableNotifications}
                onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                size="sm"
              />
            </label>
          </div>
        </div>

        {/* System Limits */}
        <div className="card bg-base-200/50 p-4 border border-base-300">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full"></span>
            System Limits
          </h6>

          {/* Concurrent Bots: Range with Color (Primary) */}
          <div className="form-control mb-6">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Max Concurrent Bots</span>
              <span className="badge badge-primary font-mono">{settings.maxConcurrentBots}</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={settings.maxConcurrentBots}
              onChange={(e) => handleChange('maxConcurrentBots', parseInt(e.target.value))}
              className="range range-primary range-md"
            />
            <div className="w-full flex justify-between text-xs px-2 mt-1 text-base-content/50">
              <span>1</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Response Timeout: Range with Size (Small) */}
          <div className="form-control mb-6">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Response Timeout (seconds)</span>
              <span className="badge badge-ghost font-mono">{settings.defaultResponseTimeout}s</span>
            </label>
            <input
              type="range"
              min="5"
              max="300"
              value={settings.defaultResponseTimeout}
              onChange={(e) => handleChange('defaultResponseTimeout', parseInt(e.target.value))}
              className="range range-xs"
            />
            <div className="w-full flex justify-between text-xs px-2 mt-1 text-base-content/50">
              <span>5s</span>
              <span>300s</span>
            </div>
          </div>

          {/* Health Check Interval: Range with Steps & Color (Accent) */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Health Check Interval</span>
              <span className="badge badge-accent font-mono">{settings.healthCheckInterval}s</span>
            </label>
            <input
              type="range"
              min="0"
              max="300"
              step="30"
              value={settings.healthCheckInterval}
              onChange={(e) => handleChange('healthCheckInterval', parseInt(e.target.value))}
              className="range range-accent"
            />
            <div className="w-full flex justify-between text-xs px-2 mt-1 font-mono">
              <span>0</span>
              <span>60</span>
              <span>120</span>
              <span>180</span>
              <span>240</span>
              <span>300</span>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card bg-base-200/50 p-4 border border-base-300">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Advanced Settings
          </h6>

          <div className="form-control">
            <label className="label cursor-pointer py-1">
              <span className="label-text text-sm">Enable Advanced Mode</span>
              <Toggle
                checked={settings.advancedMode}
                onChange={(e) => handleChange('advancedMode', e.target.checked)}
                size="sm"
              />
            </label>
            <div className="label pt-0 pb-1">
              <span className="label-text-alt text-base-content/50">
                Unlocks experimental features and granular configuration options across the system.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="primary"
          loading={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsGeneral;