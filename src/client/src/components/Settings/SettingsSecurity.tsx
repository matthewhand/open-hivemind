import React, { useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Input,
  Toggle
} from '../DaisyUI';
import {
  TrashIcon,
  PlusIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const SettingsSecurity: React.FC = () => {
  const [settings, setSettings] = useState({
    enableAuthentication: true,
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    lockoutDuration: 900,
    enableTwoFactor: false,
    enableAuditLogging: true,
    enableRateLimit: true,
    rateLimitWindow: 60,
    rateLimitMax: 100,
    enableCors: true,
    corsOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
    enableSecurityHeaders: true,
    enableApiKeyAuth: true
  });
  const [newOrigin, setNewOrigin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOrigin = () => {
    if (newOrigin && !settings.corsOrigins.includes(newOrigin)) {
      setSettings(prev => ({
        ...prev,
        corsOrigins: [...prev.corsOrigins, newOrigin]
      }));
      setNewOrigin('');
    }
  };

  const handleRemoveOrigin = (origin: string) => {
    setSettings(prev => ({
      ...prev,
      corsOrigins: prev.corsOrigins.filter(o => o !== origin)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAlert({ type: 'success', message: 'Security settings saved successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save security settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheckIcon className="w-8 h-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Security Settings</h2>
          <p className="text-base-content/70">
            Configure authentication, authorization, and security policies
          </p>
        </div>
      </div>

      {alert && (
        <div className="mb-6">
          <Alert
            status={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      <div className="space-y-8">
        {/* Authentication */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Authentication</h3>

          <Toggle
            label="Enable user authentication"
            checked={settings.enableAuthentication}
            onChange={(e) => handleChange('enableAuthentication', e.target.checked)}
            color="primary"
          />

          <div className="form-control w-full max-w-md">
            <label className="label">
              <span className="label-text">Session Timeout (seconds)</span>
            </label>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
              disabled={!settings.enableAuthentication}
              min={300}
              max={86400}
            />
            <label className="label">
              <span className="label-text-alt">How long user sessions remain active</span>
            </label>
          </div>

          <Toggle
            label="Enable two-factor authentication"
            checked={settings.enableTwoFactor}
            onChange={(e) => handleChange('enableTwoFactor', e.target.checked)}
            disabled={!settings.enableAuthentication}
            color="primary"
          />

          <Toggle
            label="Enable API key authentication"
            checked={settings.enableApiKeyAuth}
            onChange={(e) => handleChange('enableApiKeyAuth', e.target.checked)}
            color="primary"
          />
        </section>

        {/* Brute Force Protection */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Brute Force Protection</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Max Login Attempts</span>
              </label>
              <Input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
                min={3}
                max={20}
              />
              <label className="label">
                <span className="label-text-alt">Failed attempts before lockout</span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Lockout Duration (seconds)</span>
              </label>
              <Input
                type="number"
                value={settings.lockoutDuration}
                onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value))}
                min={60}
                max={3600}
              />
              <label className="label">
                <span className="label-text-alt">Lockout duration</span>
              </label>
            </div>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Rate Limiting</h3>

          <Toggle
            label="Enable API rate limiting"
            checked={settings.enableRateLimit}
            onChange={(e) => handleChange('enableRateLimit', e.target.checked)}
            color="primary"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Rate Limit Window (seconds)</span>
              </label>
              <Input
                type="number"
                value={settings.rateLimitWindow}
                onChange={(e) => handleChange('rateLimitWindow', parseInt(e.target.value))}
                disabled={!settings.enableRateLimit}
                min={10}
                max={3600}
              />
              <label className="label">
                <span className="label-text-alt">Time window for calculations</span>
              </label>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Max Requests per Window</span>
              </label>
              <Input
                type="number"
                value={settings.rateLimitMax}
                onChange={(e) => handleChange('rateLimitMax', parseInt(e.target.value))}
                disabled={!settings.enableRateLimit}
                min={10}
                max={10000}
              />
              <label className="label">
                <span className="label-text-alt">Maximum requests allowed</span>
              </label>
            </div>
          </div>
        </section>

        {/* CORS Configuration */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-base-300 pb-2">CORS Configuration</h3>

          <Toggle
            label="Enable CORS (Cross-Origin Resource Sharing)"
            checked={settings.enableCors}
            onChange={(e) => handleChange('enableCors', e.target.checked)}
            color="primary"
          />

          <div className="flex gap-2 items-end">
            <div className="form-control flex-grow">
              <label className="label">
                <span className="label-text">Add Allowed Origin</span>
              </label>
              <Input
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                placeholder="https://example.com"
                disabled={!settings.enableCors}
              />
            </div>
            <Button
              variant="secondary"
              buttonStyle="outline"
              onClick={handleAddOrigin}
              disabled={!settings.enableCors || !newOrigin}
              className="mb-0.5"
            >
              <PlusIcon className="w-5 h-5" />
              Add
            </Button>
          </div>

          <div className="bg-base-200 rounded-box p-2">
            <ul className="space-y-1">
              {settings.corsOrigins.map((origin, index) => (
                <li key={index} className="flex justify-between items-center p-2 hover:bg-base-300 rounded transition-colors">
                  <span>{origin}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error btn-circle"
                    onClick={() => handleRemoveOrigin(origin)}
                    disabled={!settings.enableCors}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </li>
              ))}
              {settings.corsOrigins.length === 0 && (
                <li className="p-4 text-center text-base-content/50 italic">
                  No origins configured
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* Security Headers */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Security Headers</h3>

          <Toggle
            label="Enable security headers (HSTS, CSP, X-Frame-Options, etc.)"
            checked={settings.enableSecurityHeaders}
            onChange={(e) => handleChange('enableSecurityHeaders', e.target.checked)}
            color="primary"
          />
        </section>

        {/* Audit Logging */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Audit Logging</h3>

          <Toggle
            label="Enable audit logging for security events"
            checked={settings.enableAuditLogging}
            onChange={(e) => handleChange('enableAuditLogging', e.target.checked)}
            color="primary"
          />
        </section>

        <div className="flex justify-end pt-6">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
            size="lg"
            loading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsSecurity;