/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, History } from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import Accordion from '../components/DaisyUI/Accordion';
import Input from '../components/DaisyUI/Input';
import Select from '../components/DaisyUI/Select';
import Toggle from '../components/DaisyUI/Toggle';
import Button from '../components/DaisyUI/Button';
import { Alert } from '../components/DaisyUI/Alert';
import Badge from '../components/DaisyUI/Badge';
import Modal from '../components/DaisyUI/Modal';
import logger from '../utils/logger';

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

  // Rollback state
  const [rollbacks, setRollbacks] = useState<string[]>([]);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const fetchRollbacks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/config/hot-reload/rollbacks`);
      if (response.ok) {
        const data = await response.json();
        setRollbacks(data.rollbacks || []);
      }
    } catch (err) {
      logger.error('Error fetching rollbacks:', err);
    }
  }, []);

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
      await fetchRollbacks();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch configuration';
      setError(message);
      logger.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleRollback = async () => {
    if (!selectedSnapshot) return;

    try {
      setRollingBack(true);
      setError(null);
      const response = await fetch(`${API_BASE}/config/hot-reload/rollback/${selectedSnapshot}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to rollback configuration');
      }

      setSuccess(`Successfully rolled back to snapshot ${selectedSnapshot}`);
      setIsRollbackModalOpen(false);
      setSelectedSnapshot(null);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback configuration');
    } finally {
      setRollingBack(false);
    }
  };

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
          {isSensitive && <Badge variant="warning" size="sm">Sensitive</Badge>}
        </label>

        {schema.format === 'boolean' || typeof value === 'boolean' ? (
          <Toggle
            color="primary"
            checked={currentValue === true || currentValue === 'true'}
            onChange={(e) => updateConfigValue(configName, key, e.target.checked)}
          />
        ) : schema.enum ? (
          <Select
            className="w-full max-w-xs"
            value={currentValue ?? ''}
            onChange={(e) => updateConfigValue(configName, key, e.target.value)}
            options={[
              { value: '', label: 'Select...' },
              ...schema.enum.map((opt: string) => ({ value: opt, label: opt }))
            ]}
          />
        ) : typeof value === 'number' || schema.format === 'int' || schema.format === 'port' ? (
          <Input
            type="number"
            className="w-full max-w-xs"
            value={currentValue ?? ''}
            onChange={(e) => updateConfigValue(configName, key, parseInt(e.target.value) || 0)}
          />
        ) : (
          <Input
            type={isSensitive ? 'password' : 'text'}
            className="w-full max-w-md"
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
          <Badge variant="ghost" size="sm">{Object.keys(values).length} settings</Badge>
          {changed && <Badge variant="warning" size="sm">Modified</Badge>}
        </div>
      ) as unknown as string,
      content: (
        <div className="py-2">
          {Object.entries(values).map(([key, value]) =>
            renderConfigField(name, key, schema[key] || {}, value),
          )}
          {changed && (
            <div className="mt-4 pt-4 border-t border-base-200">
              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={() => saveConfig(name)}
                disabled={saving}
                loading={saving}
              >
                {!saving && <Save className="w-4 h-4" />}
                Save {name} Configuration
              </Button>
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
        <Alert variant="error" icon={<AlertCircle className="w-5 h-5" />}>
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert variant="success" icon={<CheckCircle className="w-5 h-5" />}>
          <span>{success}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>Dismiss</Button>
        </Alert>
      )}

      {/* Header */}
      <PageHeader
        title="Global Defaults"
        description="System and provider settings (convict configs)"
        icon={Settings}
        gradient="accent"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setIsRollbackModalOpen(true)}
              variant="ghost"
              className="gap-2"
              disabled={loading || rollbacks.length === 0}
            >
              <History className="w-4 h-4" />
              Rollbacks {rollbacks.length > 0 && <Badge variant="primary" size="sm">{rollbacks.length}</Badge>}
            </Button>
            <Button onClick={fetchConfigs} variant="ghost" className="gap-2" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Reload
            </Button>
          </div>
        }
      />

      <Modal
        isOpen={isRollbackModalOpen}
        onClose={() => setIsRollbackModalOpen(false)}
        title="Configuration Rollbacks"
      >
        <div className="space-y-4">
          <p className="text-base-content/70">
            Select a previous configuration snapshot to rollback to. This will restore the settings to the state they were in when the snapshot was created.
          </p>

          {rollbacks.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
              No rollback snapshots available.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {rollbacks.map((snapshotId) => {
                // Parse timestamp from format like rollback_1711234567890_xxyyzz
                const timestampStr = snapshotId.split('_')[1];
                let displayDate = 'Unknown date';
                if (timestampStr) {
                  const timestamp = parseInt(timestampStr, 10);
                  if (!isNaN(timestamp)) {
                    displayDate = new Date(timestamp).toLocaleString();
                  }
                }

                return (
                  <div
                    key={snapshotId}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSnapshot === snapshotId
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedSnapshot(snapshotId)}
                  >
                    <div className="font-medium">{snapshotId}</div>
                    <div className="text-xs text-base-content/60 mt-1">
                      Created: {displayDate}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setIsRollbackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedSnapshot || rollingBack}
              loading={rollingBack}
              onClick={handleRollback}
            >
              Rollback Configuration
            </Button>
          </div>
        </div>
      </Modal>

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
