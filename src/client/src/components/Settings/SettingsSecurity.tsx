/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Input, Toggle } from '../DaisyUI';
import { Shield, Plus, Trash2 } from 'lucide-react';

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
    corsOrigins: ['http://localhost:3000'],
    enableSecurityHeaders: true,
    enableApiKeyAuth: true,
  });
  const [newOrigin, setNewOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/global');
      if (!response.ok) {throw new Error('Failed to fetch settings');}
      const data = await response.json();
      
      const config = data.config || {};
      setSettings(prev => ({
        ...prev,
        enableAuthentication: config.auth?.enabled?.value !== false,
        enableRateLimit: config.rateLimit?.enabled?.value !== false,
        rateLimitMax: config.rateLimit?.maxRequests?.value || 100,
        rateLimitWindow: config.rateLimit?.windowMs?.value ? config.rateLimit.windowMs.value / 1000 : 60,
        corsOrigins: config.cors?.origins?.value || ['http://localhost:3000'],
      }));
    } catch (error) {
      console.error('Failed to load security settings:', error);
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

  const handleAddOrigin = () => {
    if (newOrigin && !settings.corsOrigins.includes(newOrigin)) {
      setSettings(prev => ({
        ...prev,
        corsOrigins: [...prev.corsOrigins, newOrigin],
      }));
      setNewOrigin('');
    }
  };

  const handleRemoveOrigin = (origin: string) => {
    setSettings(prev => ({
      ...prev,
      corsOrigins: prev.corsOrigins.filter(o => o !== origin),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'auth.enabled': settings.enableAuthentication,
          'rateLimit.enabled': settings.enableRateLimit,
          'rateLimit.maxRequests': settings.rateLimitMax,
          'rateLimit.windowMs': settings.rateLimitWindow * 1000,
        }),
      });
      
      if (!response.ok) {throw new Error('Failed to save settings');}
      setAlert({ type: 'success', message: 'Security settings saved!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save. Some settings require environment variables.' });
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
        <Shield className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">Security Settings</h5>
          <p className="text-sm text-base-content/70">Configure authentication and security policies</p>
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
        {/* Authentication */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Authentication
          </h6>

          <div className="space-y-3">
            <div className="form-control">
              <label className="label cursor-pointer py-1">
                <span className="label-text text-sm">Enable authentication</span>
                <Toggle
                  checked={settings.enableAuthentication}
                  onChange={(e) => handleChange('enableAuthentication', e.target.checked)}
                  size="sm"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Session Timeout (seconds)</span>
              </label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                disabled={!settings.enableAuthentication}
                min={300}
                max={86400}
                size="sm"
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer py-1">
                <span className="label-text text-sm">Two-factor authentication</span>
                <Toggle
                  checked={settings.enableTwoFactor}
                  onChange={(e) => handleChange('enableTwoFactor', e.target.checked)}
                  disabled={!settings.enableAuthentication}
                  size="sm"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full"></span>
            Rate Limiting
          </h6>

          <div className="space-y-3">
            <div className="form-control">
              <label className="label cursor-pointer py-1">
                <span className="label-text text-sm">Enable rate limiting</span>
                <Toggle
                  checked={settings.enableRateLimit}
                  onChange={(e) => handleChange('enableRateLimit', e.target.checked)}
                  size="sm"
                />
              </label>
            </div>

            <div className={`form-control ${!settings.enableRateLimit ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Time Window (seconds)</span>
              </label>
              <Input
                type="number"
                value={settings.rateLimitWindow}
                onChange={(e) => handleChange('rateLimitWindow', parseInt(e.target.value))}
                disabled={!settings.enableRateLimit}
                min={10}
                max={3600}
                size="sm"
              />
            </div>

            <div className={`form-control ${!settings.enableRateLimit ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Max Requests per Window</span>
              </label>
              <Input
                type="number"
                value={settings.rateLimitMax}
                onChange={(e) => handleChange('rateLimitMax', parseInt(e.target.value))}
                disabled={!settings.enableRateLimit}
                min={10}
                max={10000}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* CORS */}
        <div className="card bg-base-200/50 p-4 lg:col-span-2">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            CORS Configuration
          </h6>

          <div className="flex gap-2 mb-3">
            <Input
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              placeholder="https://example.com"
              size="sm"
              className="flex-grow"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddOrigin}
              disabled={!newOrigin}
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {settings.corsOrigins.map((origin, index) => (
              <div key={index} className="badge badge-lg gap-2 bg-base-300">
                {origin}
                <button 
                  onClick={() => handleRemoveOrigin(origin)}
                  className="hover:text-error"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {settings.corsOrigins.length === 0 && (
              <span className="text-base-content/50 text-sm italic">No origins configured</span>
            )}
          </div>
        </div>

        {/* Security Features */}
        <div className="card bg-base-200/50 p-4 lg:col-span-2">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            Security Features
          </h6>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label cursor-pointer py-1">
                <span className="label-text text-sm">Security headers</span>
                <Toggle
                  checked={settings.enableSecurityHeaders}
                  onChange={(e) => handleChange('enableSecurityHeaders', e.target.checked)}
                  size="sm"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer py-1">
                <span className="label-text text-sm">Audit logging</span>
                <Toggle
                  checked={settings.enableAuditLogging}
                  onChange={(e) => handleChange('enableAuditLogging', e.target.checked)}
                  size="sm"
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer py-1">
                <span className="label-text text-sm">API key auth</span>
                <Toggle
                  checked={settings.enableApiKeyAuth}
                  onChange={(e) => handleChange('enableApiKeyAuth', e.target.checked)}
                  size="sm"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          loading={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsSecurity;