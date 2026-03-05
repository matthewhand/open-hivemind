/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Lock } from 'lucide-react';

interface ConfigSchema {
  values: Record<string, any>;
  schema: {
    properties: Record<string, any>;
  };
}

interface ConfigEditorProps {
  configName: string;
  configData: ConfigSchema;
  onSave: (configName: string, updates: Record<string, any>) => Promise<void>;
  title?: string;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ configName, configData, onSave, title }) => {
  const [modifiedConfig, setModifiedConfig] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset modified state when configData changes
  useEffect(() => {
    setModifiedConfig({});
    setError(null);
    setSuccess(null);
  }, [configData]);

  const updateConfigValue = (key: string, value: any) => {
    setModifiedConfig(prev => ({
      ...prev,
      [key]: value,
    }));
    setSuccess(null);
  };

  const handleSave = async () => {
    if (Object.keys(modifiedConfig).length === 0) {return;}

    try {
      setSaving(true);
      setError(null);
      await onSave(configName, modifiedConfig);
      setSuccess('Configuration saved successfully');
      setModifiedConfig({}); // Clear changes after save
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentValue = (key: string) => {
    if (modifiedConfig[key] !== undefined) {
      return modifiedConfig[key];
    }
    return configData.values?.[key];
  };

  const hasChanges = Object.keys(modifiedConfig).length > 0;
  const schemaProps = configData.schema?.properties || configData.schema || {};

  const renderConfigField = (key: string, schema: any, value: any) => {
    const currentValue = getCurrentValue(key);
    const isSensitive = schema.sensitive === true;
    const isBoolean = schema.format === 'boolean' || typeof value === 'boolean';
    const isNumber = typeof value === 'number' || schema.format === 'int' || schema.format === 'port';
    const isEnum = !!schema.enum;
    const isLocked = schema.locked === true;

    return (
      <div key={key} className={`form-control w-full mb-4 p-4 rounded-lg border ${isLocked ? 'bg-base-200/30 border-base-200' : 'bg-base-200/50 border-base-300'}`}>
        <label className="label">
          <div className="flex items-center gap-2">
            <span className={`label-text font-medium text-base ${isLocked ? 'opacity-70' : ''}`}>{key}</span>
            {isLocked && <Lock className="w-3 h-3 text-warning" />}
          </div>
          <div className="flex gap-2">
            {isSensitive && <span className="badge badge-warning badge-sm">Sensitive</span>}
            {isLocked && <span className="badge badge-ghost badge-sm gap-1"><Lock className="w-3 h-3" /> Env Var</span>}
            {hasChanges && modifiedConfig[key] !== undefined && <span className="badge badge-info badge-sm">Modified</span>}
          </div>
        </label>

        <div className={isLocked ? 'tooltip tooltip-bottom' : ''} data-tip={isLocked ? `Managed by ${schema.env}` : ''}>
          {isBoolean ? (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={currentValue === true || currentValue === 'true'}
                onChange={(e) => updateConfigValue(key, e.target.checked)}
                disabled={isLocked}
              />
              <span className={`label-text-alt ${isLocked ? 'opacity-50' : 'opacity-70'}`}>
                {currentValue ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ) : isEnum ? (
            <select
              className={`select select-bordered w-full ${isLocked ? 'select-disabled bg-base-100/50' : ''}`}
              value={currentValue ?? ''}
              onChange={(e) => updateConfigValue(key, e.target.value)}
              disabled={isLocked}
            >
              <option value="">Select...</option>
              {schema.enum.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : isNumber ? (
            <input
              type="number"
              className={`input input-bordered w-full ${isLocked ? 'input-disabled bg-base-100/50' : ''}`}
              value={currentValue ?? ''}
              onChange={(e) => updateConfigValue(key, parseInt(e.target.value) || 0)}
              disabled={isLocked}
              readOnly={isLocked}
            />
          ) : (
            <input
              type={isSensitive ? 'password' : 'text'}
              className={`input input-bordered w-full ${isLocked ? 'input-disabled bg-base-100/50' : ''}`}
              value={currentValue ?? ''}
              placeholder={isSensitive ? '••••••••' : ''}
              onChange={(e) => updateConfigValue(key, e.target.value)}
              disabled={isLocked}
              readOnly={isLocked}
            />
          )}
        </div>

        {schema.doc && (
          <label className="label">
            <span className="label-text-alt text-base-content/60">{schema.doc}</span>
          </label>
        )}
        {schema.env && (
          <label className="label py-0">
            <span className="label-text-alt text-base-content/40 font-mono text-xs">ENV: {schema.env}</span>
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4 border-b border-base-200 pb-4">
          <h3 className="card-title text-lg capitalize">{title || configName}</h3>
          {hasChanges && (
            <button
              className="btn btn-primary btn-sm gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-4 h-4" />}
                        Save Changes
            </button>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="alert alert-error text-sm py-2 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success text-sm py-2 mb-4">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {Object.entries(configData.values || {}).map(([key, value]) =>
            renderConfigField(key, schemaProps[key] || {}, value),
          )}
        </div>
            
        {Object.keys(configData.values || {}).length === 0 && (
          <div className="text-center py-8 opacity-50">
                    No configuration fields found.
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigEditor;
