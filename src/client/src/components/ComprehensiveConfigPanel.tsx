import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Toggle, Loading, Textarea } from './DaisyUI';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfigSchema {
  doc?: string;
  format?: string | string[];
  default?: any;
  env?: string;
}

interface ConfigItem {
  values: Record<string, any>;
  schema: Record<string, any>;
}

type GlobalConfig = Record<string, ConfigItem>;

const ComprehensiveConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('message');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state for JSON textareas to allow editing invalid JSON temporarily
  const [jsonState, setJsonState] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config/global');
      if (!res.ok) throw new Error('Failed to fetch configuration');
      const data = await res.json();
      setConfig(data);
      if (data && Object.keys(data).length > 0) {
        setActiveTab(Object.keys(data)[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string, values: Record<string, any>) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Merge any valid JSON state back into values before saving
    const valuesToSave = { ...values };
    Object.entries(jsonState).forEach(([key, jsonStr]) => {
      // Only include if it belongs to the current section (keys are unique enough or we prefix)
      if (key.startsWith(`${section}.`)) {
        const fieldName = key.split('.')[1];
        try {
          valuesToSave[fieldName] = JSON.parse(jsonStr);
        } catch (e) {
          // Ignore invalid JSON, maybe warn user?
          console.warn(`Skipping invalid JSON for ${fieldName}`);
        }
      }
    });

    try {
      const res = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configName: section, updates: valuesToSave })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save configuration');
      }

      setSuccessMessage(`Configuration for ${section} saved successfully`);
      // Refresh config to ensure sync
      await fetchConfig();
      setJsonState({}); // Clear local JSON state
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const renderField = (key: string, value: any, schema: ConfigSchema, section: string) => {
    const handleChange = (newValue: any) => {
      if (!config) return;
      const newConfig = JSON.parse(JSON.stringify(config));
      newConfig[section].values[key] = newValue;
      setConfig(newConfig);
    };

    const isReadOnly = key.toUpperCase().includes('KEY') || key.toUpperCase().includes('TOKEN') || key.toUpperCase().includes('SECRET');

    let type = 'text';
    if (typeof value === 'boolean' || schema.format === 'Boolean') type = 'boolean';
    else if (typeof value === 'number' || schema.format === 'int' || schema.format === 'port' || schema.format === 'Number') type = 'number';
    else if (Array.isArray(value) || schema.format === 'Array') type = 'array';

    if (Array.isArray(schema.format)) {
      return (
        <div className="form-control w-full" key={key}>
          <label className="label">
            <span className="label-text font-semibold">{key}</span>
            {schema.env && <span className="label-text-alt badge badge-ghost badge-sm">{schema.env}</span>}
          </label>
          <Select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            options={schema.format.map((opt: string) => ({ value: opt, label: opt }))}
          />
          {schema.doc && <label className="label"><span className="label-text-alt text-base-content/70">{schema.doc}</span></label>}
        </div>
      );
    }

    if (type === 'boolean') {
      return (
        <div className="form-control w-full" key={key}>
          <label className="label cursor-pointer justify-start gap-4">
            <span className="label-text font-semibold">{key}</span>
            <Toggle checked={value} onChange={(e) => handleChange(e.target.checked)} />
            {schema.env && <span className="label-text-alt badge badge-ghost badge-sm">{schema.env}</span>}
          </label>
          {schema.doc && <div className="pl-1"><span className="label-text-alt text-base-content/70">{schema.doc}</span></div>}
        </div>
      );
    }

    if (type === 'number') {
      return (
        <div className="form-control w-full" key={key}>
          <label className="label">
            <span className="label-text font-semibold">{key}</span>
            {schema.env && <span className="label-text-alt badge badge-ghost badge-sm">{schema.env}</span>}
          </label>
          <Input
            type="number"
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
          />
          {schema.doc && <label className="label"><span className="label-text-alt text-base-content/70">{schema.doc}</span></label>}
        </div>
      );
    }

    if (type === 'array') {
      return (
        <div className="form-control w-full" key={key}>
          <label className="label">
            <span className="label-text font-semibold">{key}</span>
            {schema.env && <span className="label-text-alt badge badge-ghost badge-sm">{schema.env}</span>}
          </label>
          <Input
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) => handleChange(e.target.value.split(',').map((s: string) => s.trim()))}
            placeholder="Comma separated values"
          />
          {schema.doc && <label className="label"><span className="label-text-alt text-base-content/70">{schema.doc}</span></label>}
        </div>
      );
    }

    return (
      <div className="form-control w-full" key={key}>
        <label className="label">
          <span className="label-text font-semibold">{key}</span>
          {schema.env && <span className="label-text-alt badge badge-ghost badge-sm">{schema.env}</span>}
        </label>
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isReadOnly}
          placeholder={isReadOnly ? '********' : ''}
        />
        {schema.doc && <label className="label"><span className="label-text-alt text-base-content/70">{schema.doc}</span></label>}
      </div>
    );
  };

  if (loading) return <div className="flex justify-center p-8"><Loading size="lg" /></div>;
  if (error) return <Alert status="error" message={error} />;
  if (!config) return <Alert status="warning" message="No configuration found" />;

  const activeConfig = config[activeTab];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="tabs tabs-boxed">
          {Object.keys(config).map(key => (
            <a
              key={key}
              className={`tab ${activeTab === key ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </a>
          ))}
        </div>

        {successMessage && (
          <Alert status="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
        )}

        <Card className="bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title capitalize">{activeTab} Configuration</h2>
              <Button
                variant="primary"
                onClick={() => handleSave(activeTab, activeConfig.values)}
                disabled={saving}
                loading={saving}
              >
                Save Changes
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(activeConfig.values).map(([key, value]) => {
                // Handle objects (JSON editor)
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  const stateKey = `${activeTab}.${key}`;
                  const currentValue = jsonState[stateKey] !== undefined
                    ? jsonState[stateKey]
                    : JSON.stringify(value, null, 2);

                  let isValidJson = true;
                  try { JSON.parse(currentValue); } catch { isValidJson = false; }

                  return (
                    <div className="form-control w-full col-span-2" key={key}>
                      <label className="label">
                        <span className="label-text font-semibold">{key}</span>
                        {activeConfig.schema[key]?.env && <span className="label-text-alt badge badge-ghost badge-sm">{activeConfig.schema[key].env}</span>}
                      </label>
                      <Textarea
                        className="h-32 font-mono text-sm"
                        value={currentValue}
                        onChange={(e) => setJsonState(prev => ({ ...prev, [stateKey]: e.target.value }))}
                        placeholder="{}"
                        variant={!isValidJson ? 'error' : undefined}
                        bordered
                      />
                      <label className="label">
                        <span className="label-text-alt text-base-content/70">
                          {activeConfig.schema[key]?.doc || 'JSON Configuration Object'}
                        </span>
                        {!isValidJson && <span className="label-text-alt text-error">Invalid JSON</span>}
                      </label>
                    </div>
                  );
                }

                const schemaNode = activeConfig.schema[key] || {};
                return renderField(key, value, schemaNode, activeTab);
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ComprehensiveConfigPanel;