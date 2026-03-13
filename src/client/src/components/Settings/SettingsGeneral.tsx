/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert } from '../DaisyUI/Alert';
import Input from '../DaisyUI/Input';
import Select from '../DaisyUI/Select';
import Toggle from '../DaisyUI/Toggle';
import Button from '../DaisyUI/Button';
import { Settings as SettingsIcon, ShieldCheck, Activity } from 'lucide-react';

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    };
  }, []);

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
      setFetchError(null);
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
      setFetchError(error instanceof Error ? error.message : 'An unknown error occurred while fetching settings.');
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
          'app.timezone': settings.timezone,
          'app.language': settings.language,
          'webui.theme': settings.theme,
          'webui.notifications': settings.enableNotifications,
          'logging.level': settings.logLevel,
          'logging.enabled': settings.enableLogging,
          'limits.maxBots': settings.maxConcurrentBots,
          'limits.timeout': settings.defaultResponseTimeout,
          'health.enabled': settings.enableHealthChecks,
          'health.interval': settings.healthCheckInterval,
          'webui.advancedMode': settings.advancedMode,
        }),
      });

      if (!response.ok) { throw new Error('Failed to save settings'); }
      setAlert({ type: 'success', message: 'Settings saved successfully!' });
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
      alertTimerRef.current = setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save settings. Some settings may require environment variables.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
          <div>
            <div className="h-5 w-48 bg-base-300 rounded mb-1 animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="h-4 w-64 bg-base-300 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i, index) => (
            <div key={i} className="card bg-base-100 border border-base-300 shadow-sm p-4 h-full">
              <div className="h-6 bg-base-300 rounded w-1/3 mb-4 animate-pulse" style={{ animationDelay: `${index * 150}ms` }}></div>
              <div className="space-y-4">
                <div>
                  <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse" style={{ animationDelay: `${index * 150 + 50}ms` }}></div>
                  <div className="h-10 bg-base-300 rounded w-full animate-pulse" style={{ animationDelay: `${index * 150 + 100}ms` }}></div>
                </div>
                <div>
                  <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse" style={{ animationDelay: `${index * 150 + 150}ms` }}></div>
                  <div className="h-24 bg-base-300 rounded w-full animate-pulse" style={{ animationDelay: `${index * 150 + 200}ms` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-error mb-2">
          <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-lg text-center">{fetchError}</p>
        </div>
        <Button variant="primary" onClick={fetchSettings} className="gap-2">
           <Activity className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  const commonCardClass = "card bg-base-100 border border-base-300 shadow-sm p-4 h-full";

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
        <div className={commonCardClass}>
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
        <div className={commonCardClass}>
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
        </div>

        {/* Logging */}
        <div className={commonCardClass}>
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            Logging & Notifications
          </h6>

          <div className="form-control mb-4">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Log Level</span>
            </label>
            <Select
              value={settings.logLevel}
              onChange={(e) => handleChange('logLevel', e.target.value)}
              size="sm"
              options={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]}
            />
          </div>

          <div className="space-y-3">
            <Toggle
              label="Enable Detailed Logging"
              checked={settings.enableLogging}
              onChange={(checked) => handleChange('enableLogging', checked)}
              size="sm"
            />
            <Toggle
              label="Enable Desktop Notifications"
              checked={settings.enableNotifications}
              onChange={(checked) => handleChange('enableNotifications', checked)}
              size="sm"
            />
          </div>
        </div>

        {/* System Limits */}
        <div className={commonCardClass}>
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full"></span>
            System Limits & Health
          </h6>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Max Bots</span>
              </label>
              <Input
                type="number"
                value={settings.maxConcurrentBots}
                onChange={(e) => handleChange('maxConcurrentBots', parseInt(e.target.value))}
                size="sm"
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Timeout (s)</span>
              </label>
              <Input
                type="number"
                value={settings.defaultResponseTimeout}
                onChange={(e) => handleChange('defaultResponseTimeout', parseInt(e.target.value))}
                size="sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Toggle
              label="Enable Background Health Checks"
              checked={settings.enableHealthChecks}
              onChange={(checked) => handleChange('enableHealthChecks', checked)}
              size="sm"
            />
            {settings.enableHealthChecks && (
              <div className="form-control mt-2 pl-4 border-l-2 border-base-300">
                <label className="label py-1">
                  <span className="label-text text-xs font-medium">Interval (seconds)</span>
                </label>
                <Input
                  type="number"
                  value={settings.healthCheckInterval}
                  onChange={(e) => handleChange('healthCheckInterval', parseInt(e.target.value))}
                  size="xs"
                />
              </div>
            )}
            <Toggle
              label="Advanced Mode (Show all options)"
              checked={settings.advancedMode}
              onChange={(checked) => handleChange('advancedMode', checked)}
              size="sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-base-300">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          className="min-w-[120px]"
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsGeneral;
