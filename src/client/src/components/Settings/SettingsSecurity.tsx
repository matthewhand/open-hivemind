/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Input, Toggle } from '../DaisyUI';
import { Shield, Lock, Activity, Globe, Plus, Trash2 } from 'lucide-react';
import { apiService } from '../../services/api';

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
      const data = await apiService.getGlobalConfig();
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
      setAlert({ type: 'error', message: 'Failed to load security settings' });
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
    setAlert(null);
    try {
      await apiService.updateGlobalConfig({
        'auth.enabled': settings.enableAuthentication,
        'rateLimit.enabled': settings.enableRateLimit,
        'rateLimit.maxRequests': settings.rateLimitMax,
        'rateLimit.windowMs': settings.rateLimitWindow * 1000,
      });
      
      setAlert({ type: 'success', message: 'Security settings saved successfully!' });
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Failed to save security settings:', error);
      setAlert({ type: 'error', message: 'Failed to save. Check permissions.' });
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
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Security Policies</h2>
          <p className="text-sm text-base-content/70">Configure authentication and access control</p>
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
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-primary" />
              Access Control
            </h3>

            <div className="form-control mb-4">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.enableAuthentication}
                  onChange={(e) => handleChange('enableAuthentication', e.target.checked)}
                  color="primary"
                />
                <span className="label-text font-medium">Require Authentication</span>
              </label>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Session Timeout (seconds)</span>
              </label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                disabled={!settings.enableAuthentication}
                className="input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.enableTwoFactor}
                  onChange={(e) => handleChange('enableTwoFactor', e.target.checked)}
                  disabled={!settings.enableAuthentication}
                />
                <span className="label-text font-medium">Enable Two-Factor Auth (MFA)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-warning" />
              Rate Limiting
            </h3>

            <div className="form-control mb-4">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.enableRateLimit}
                  onChange={(e) => handleChange('enableRateLimit', e.target.checked)}
                  color="warning"
                />
                <span className="label-text font-medium">Enable Rate Limiting</span>
              </label>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Window Duration (seconds)</span>
              </label>
              <Input
                type="number"
                value={settings.rateLimitWindow}
                onChange={(e) => handleChange('rateLimitWindow', parseInt(e.target.value))}
                disabled={!settings.enableRateLimit}
                className="input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Max Requests per Window</span>
              </label>
              <Input
                type="number"
                value={settings.rateLimitMax}
                onChange={(e) => handleChange('rateLimitMax', parseInt(e.target.value))}
                disabled={!settings.enableRateLimit}
                className="input-bordered"
              />
            </div>
          </div>
        </div>

        {/* CORS Configuration */}
        <div className="card bg-base-100 border border-base-200 shadow-sm lg:col-span-2">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-info" />
              Cross-Origin Resource Sharing (CORS)
            </h3>

            <div className="flex gap-2 mb-4">
              <Input
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                placeholder="https://example.com"
                className="flex-grow input-bordered"
                onKeyDown={(e) => e.key === 'Enter' && handleAddOrigin()}
              />
              <Button
                variant="secondary"
                onClick={handleAddOrigin}
                disabled={!newOrigin}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Origin
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[50px] bg-base-200/50 p-4 rounded-lg border border-base-200">
              {settings.corsOrigins.map((origin, index) => (
                <div key={index} className="badge badge-lg gap-2 bg-base-100 border border-base-300 shadow-sm">
                  {origin}
                  <button
                    onClick={() => handleRemoveOrigin(origin)}
                    className="hover:text-error transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {settings.corsOrigins.length === 0 && (
                <span className="text-base-content/50 text-sm italic">No allowed origins configured</span>
              )}
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
          {isSaving ? 'Saving...' : 'Save Security Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsSecurity;
