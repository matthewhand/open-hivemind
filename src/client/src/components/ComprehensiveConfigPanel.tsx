import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Toggle, Loading } from './DaisyUI';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfigSchema {
  doc?: string;
  format?: string | string[];
  default?: any;
  env?: string;
}

interface ConfigItem {
  values: Record<string, any>;
  schema: {
    _dct: Record<string, ConfigSchema>;
  };
}

type GlobalConfig = Record<string, ConfigItem>;

const ComprehensiveConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('message');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleSave = async (section: string, updates: Record<string, any>) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configName: section, updates })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save configuration');
      }

      setSuccessMessage(`Configuration for ${section} saved successfully`);
      // Refresh config to ensure sync
      await fetchConfig();
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
      // Optimistic update locally (deep copy to avoid mutation issues)
      const newConfig = JSON.parse(JSON.stringify(config));
      newConfig[section].values[key] = newValue;
      setConfig(newConfig);
    };

    const isReadOnly = key.toUpperCase().includes('KEY') || key.toUpperCase().includes('TOKEN') || key.toUpperCase().includes('SECRET');

    // Determine type from schema or value
    let type = 'text';
    if (typeof value === 'boolean' || schema.format === 'Boolean') type = 'boolean';
    else if (typeof value === 'number' || schema.format === 'int' || schema.format === 'port' || schema.format === 'Number') type = 'number';
    else if (Array.isArray(value) || schema.format === 'Array') type = 'array';

    // Handle specific formats if defined in schema
    if (Array.isArray(schema.format)) {
      // Enum select
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

    // Default text input
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
  // Flatten schema structure for easier access if needed, but convict schema is nested in _dct usually
  // Actually convict schema structure is complex. Let's assume a simplified flat structure for now based on our backend implementation
  // or iterate over values and look up schema.

  // The backend sends: values: {...}, schema: {_dct: ...} or similar.
  // Let's iterate over values.

  // Helper to find schema for a key (handling nested properties if any, though convict usually flattens or uses dot notation)
  // For this implementation, we'll assume flat keys or simple nesting.

  // Note: Convict's getSchema() returns a nested object matching the config structure, where leaves are schema objects.
  // We need to traverse it.

  const getSchemaForKey = (obj: any, keyPath: string): ConfigSchema => {
    const keys = keyPath.split('.');
    let current = obj;
    for (const k of keys) {
      if (current && current[k]) {
        current = current[k];
      } else if (current && current.properties && current.properties[k]) {
        current = current.properties[k];
      } else {
        return {};
      }
    }
    return current;
  };

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
                // Skip complex objects for now if not handled
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  // Recursive rendering could go here, but for now let's skip or JSON stringify
                  return null;
                }

                // Find schema
                // The schema object from convict is nested.
                // We need to find the schema definition for this key.
                // Since we are iterating values which might be flat or nested, 
                // let's assume the backend sent a structure where schema matches values structure.
                // Actually, convict values are nested if the schema is nested.

                // Let's try to find the schema node.
                // If activeConfig.schema has the same structure as values but with schema props.
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