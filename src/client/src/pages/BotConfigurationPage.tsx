import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import Accordion from '../components/DaisyUI/Accordion';

interface ConfigSchema {
  values: Record<string, any>;
  schema: {
    properties: Record<string, any>;
  };
}

interface GlobalConfigs {
  [key: string]: ConfigSchema;
}

const API_BASE = '/api';

const BotConfigurationPage: React.FC = () => {
  const [configs, setConfigs] = useState<GlobalConfigs>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modifiedConfigs, setModifiedConfigs] = useState<Record<string, Record<string, any>>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/config/global`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      const data = await response.json();
      setConfigs(data);
      setModifiedConfigs({});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch configuration';
      setError(message);
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const updateConfigValue = (configName: string, key: string, value: any) => {
    setModifiedConfigs(prev => ({
      ...prev,
      [configName]: {
        ...(prev[configName] || {}),
        [key]: value,
      },
    }));
    setSuccess(null);
  };

  const saveConfig = async (configName: string) => {
    const updates = modifiedConfigs[configName];
    if (!updates || Object.keys(updates).length === 0) {return;}

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`${API_BASE}/config/global`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configName,
          updates,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      setSuccess(`${configName} configuration saved successfully`);
      // Clear modified state for this config
      setModifiedConfigs(prev => {
        const next = { ...prev };
        delete next[configName];
        return next;
      });

      // Refresh to get updated values
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (configName: string) => {
    return modifiedConfigs[configName] && Object.keys(modifiedConfigs[configName]).length > 0;
  };

  const getCurrentValue = (configName: string, key: string) => {
    if (modifiedConfigs[configName]?.[key] !== undefined) {
      return modifiedConfigs[configName][key];
    }
    return configs[configName]?.values?.[key];
  };

  const renderConfigField = (configName: string, key: string, schema: any, value: any) => {
    const currentValue = getCurrentValue(configName, key);
    const isSensitive = schema.sensitive === true;

    return (
      <div key={key} className="form-control mb-4">
        <label className="label">
          <span className="label-text font-medium">{key}</span>
          {isSensitive && <span className="badge badge-warning badge-sm">Sensitive</span>}
        </label>

        {schema.format === 'boolean' || typeof value === 'boolean' ? (
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={currentValue === true || currentValue === 'true'}
            onChange={(e) => updateConfigValue(configName, key, e.target.checked)}
          />
        ) : schema.enum ? (
          <select
            className="select select-bordered w-full max-w-xs"
            value={currentValue ?? ''}
            onChange={(e) => updateConfigValue(configName, key, e.target.value)}
          >
            <option value="">Select...</option>
            {schema.enum.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : typeof value === 'number' || schema.format === 'int' || schema.format === 'port' ? (
          <input
            type="number"
            className="input input-bordered w-full max-w-xs"
            value={currentValue ?? ''}
            onChange={(e) => updateConfigValue(configName, key, parseInt(e.target.value) || 0)}
          />
        ) : (
          <input
            type={isSensitive ? 'password' : 'text'}
            className="input input-bordered w-full max-w-md"
            value={currentValue ?? ''}
            placeholder={isSensitive ? '••••••••' : ''}
            onChange={(e) => updateConfigValue(configName, key, e.target.value)}
          />
        )}

        {schema.doc && (
          <label className="label">
            <span className="label-text-alt text-base-content/50">{schema.doc}</span>
          </label>
        )}
        {schema.env && (
          <label className="label py-0">
            <span className="label-text-alt text-base-content/60 font-mono text-xs">ENV: {schema.env}</span>
          </label>
        )}
      </div>
    );
  };

  const configNames = Object.keys(configs).sort();

  const accordionItems = configNames.map(name => {
    const config = configs[name];
    const values = config?.values || {};
    const schema = config?.schema?.properties || {};
    const changed = hasChanges(name);

    return {
      id: name,
      title: (
        <div className="flex items-center gap-3 w-full">
          <span className="capitalize">{name}</span>
          <span className="badge badge-ghost badge-sm">{Object.keys(values).length} settings</span>
          {changed && <span className="badge badge-warning badge-sm">Modified</span>}
        </div>
      ) as unknown as string,
      content: (
        <div className="py-2">
          {Object.entries(values).map(([key, value]) =>
            renderConfigField(name, key, schema[key] || {}, value),
          )}
          {changed && (
            <div className="mt-4 pt-4 border-t border-base-200">
              <button
                className="btn btn-primary btn-sm gap-2"
                onClick={() => saveConfig(name)}
                disabled={saving}
              >
                {saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-4 h-4" />}
                Save {name} Configuration
              </button>
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="alert alert-success">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Global Defaults"
        description="System and provider settings (convict configs)"
        icon={Settings}
        gradient="accent"
        actions={
          <button onClick={fetchConfigs} className="btn btn-ghost gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
        }
      />

      {/* Stats */}
      <div className="stats stats-horizontal bg-base-200 w-full">
        <div className="stat">
          <div className="stat-title">Config Sections</div>
          <div className="stat-value text-primary">{configNames.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Settings</div>
          <div className="stat-value">
            {Object.values(configs).reduce((sum, c) => sum + Object.keys(c?.values || {}).length, 0)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Modified</div>
          <div className="stat-value text-warning">
            {Object.keys(modifiedConfigs).filter(k => Object.keys(modifiedConfigs[k]).length > 0).length}
          </div>
        </div>
      </div>

      {/* Config Accordion */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : configNames.length === 0 ? (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body text-center py-12">
            <Settings className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-lg font-medium text-base-content/60">No configurations found</h3>
            <p className="text-base-content/50">Check that the config endpoint is working</p>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <Accordion
              items={accordionItems}
              allowMultiple={true}
              defaultOpenItems={configNames.slice(0, 1)}
              variant="bordered"
              size="md"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BotConfigurationPage;