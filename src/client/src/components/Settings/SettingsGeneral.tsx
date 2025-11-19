import React, { useState } from 'react';
import { Alert, Input, Select, Toggle, Button, Divider } from '../DaisyUI';

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
    <div className="space-y-6">
      <div>
        <h5 className="text-xl font-bold mb-2">General Settings</h5>
        <p className="text-sm text-base-content/70 mb-4">Configure basic instance settings and preferences</p>
      </div>

      {alert && (
        <Alert 
          status={alert.type === 'success' ? 'success' : 'error'} 
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="flex flex-col gap-6">
        {/* Instance Information */}
        <h6 className="text-lg font-semibold">Instance Information</h6>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">Instance Name</span>
          </label>
          <Input
            value={settings.instanceName}
            onChange={(e) => handleChange('instanceName', e.target.value)}
            placeholder="Display name for this Open-Hivemind instance"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <Input
            value={settings.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Brief description of this instance's purpose"
            type="textarea"
            rows={3}
          />
        </div>

        <Divider />

        {/* Localization */}
        <h6 className="text-lg font-semibold">Localization</h6>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Timezone</span>
          </label>
          <Select
            value={settings.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            options={[
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'Eastern Time' },
              { value: 'America/Chicago', label: 'Central Time' },
              { value: 'America/Denver', label: 'Mountain Time' },
              { value: 'America/Los_Angeles', label: 'Pacific Time' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Europe/Paris', label: 'Paris' },
              { value: 'Asia/Tokyo', label: 'Tokyo' }
            ]}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Language</span>
          </label>
          <Select
            value={settings.language}
            onChange={(e) => handleChange('language', e.target.value)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'ja', label: 'Japanese' },
              { value: 'zh', label: 'Chinese' }
            ]}
          />
        </div>

        <Divider />

        {/* Appearance */}
        <h6 className="text-lg font-semibold">Appearance</h6>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Theme</span>
          </label>
          <Select
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            options={[
              { value: 'auto', label: 'Auto (System)' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' }
            ]}
          />
        </div>

        <Divider />

        {/* System Behavior */}
        <h6 className="text-lg font-semibold">System Behavior</h6>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Max Concurrent Bots</span>
          </label>
          <Input
            type="number"
            value={settings.maxConcurrentBots}
            onChange={(e) => handleChange('maxConcurrentBots', parseInt(e.target.value))}
            placeholder="Maximum number of bots that can run simultaneously"
            min={1}
            max={100}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Default Response Timeout (seconds)</span>
          </label>
          <Input
            type="number"
            value={settings.defaultResponseTimeout}
            onChange={(e) => handleChange('defaultResponseTimeout', parseInt(e.target.value))}
            placeholder="How long to wait for bot responses before timing out"
            min={5}
            max={300}
          />
        </div>

        <Divider />

        {/* Notifications & Logging */}
        <h6 className="text-lg font-semibold">Notifications & Logging</h6>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Enable system notifications</span>
            <Toggle
              checked={settings.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
            />
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Enable system logging</span>
            <Toggle
              checked={settings.enableLogging}
              onChange={(e) => handleChange('enableLogging', e.target.checked)}
            />
          </label>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Log Level</span>
          </label>
          <Select
            value={settings.logLevel}
            onChange={(e) => handleChange('logLevel', e.target.value)}
            disabled={!settings.enableLogging}
            options={[
              { value: 'debug', label: 'Debug' },
              { value: 'info', label: 'Info' },
              { value: 'warn', label: 'Warning' },
              { value: 'error', label: 'Error' }
            ]}
          />
        </div>

        <Divider />

        {/* Health Monitoring */}
        <h6 className="text-lg font-semibold">Health Monitoring</h6>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Enable automated health checks</span>
            <Toggle
              checked={settings.enableHealthChecks}
              onChange={(e) => handleChange('enableHealthChecks', e.target.checked)}
            />
          </label>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Health Check Interval (seconds)</span>
          </label>
          <Input
            type="number"
            value={settings.healthCheckInterval}
            onChange={(e) => handleChange('healthCheckInterval', parseInt(e.target.value))}
            disabled={!settings.enableHealthChecks}
            placeholder="How often to run health checks"
            min={10}
            max={3600}
          />
        </div>

        <div className="flex justify-end mt-8">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="large"
            variant="primary"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsGeneral;