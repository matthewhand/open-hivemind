import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Select, Toggle, Loading, Textarea } from './DaisyUI';

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

interface GlobalConfigSectionProps {
  section: string;
}

const GlobalConfigSection: React.FC<GlobalConfigSectionProps> = ({ section }) => {
  const [config, setConfig] = useState<ConfigItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [jsonState, setJsonState] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const isMessageProviderSection = ['discord', 'slack', 'mattermost'].includes(section);

  useEffect(() => {
    fetchConfig();
  }, [section]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config/global');
      if (!res.ok) throw new Error('Failed to fetch configuration');
      const data = await res.json();
      if (data && data[section]) {
        setConfig(data[section]);
      } else {
        // setError(`Configuration section '${section}' not found`);
        // If not found, maybe initialize empty or show warning
        setConfig(null); 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: Record<string, any>) => {
    setSaving(true);
    setSuccess(null);
    setError(null);

     // Merge any valid JSON state back into values before saving
     const valuesToSave = { ...values };
     Object.entries(jsonState).forEach(([key, jsonStr]) => {
         try {
           valuesToSave[key] = JSON.parse(jsonStr);
         } catch (e) {
           console.warn(`Skipping invalid JSON for ${section}.${key}`);
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

      setSuccess('Configuration saved successfully');
      await fetchConfig(); // Refresh
      setJsonState({}); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleTestConnection = async () => {
    if (!config) return;
    setTesting(true);
    setTestStatus(null);
    try {
      const stored = localStorage.getItem('auth_tokens');
      const accessToken = stored ? (JSON.parse(stored) as { accessToken?: string })?.accessToken : undefined;
      const res = await fetch('/api/config/message-provider/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          provider: section,
          config: config.values,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.message || data.error || 'Connection test failed');
      }
      setTestStatus({ type: 'success', message: data.message || 'Connection successful' });
    } catch (err: any) {
      setTestStatus({ type: 'error', message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const renderField = (key: string, value: any, schema: ConfigSchema) => {
    const handleChange = (newValue: any) => {
      if (!config) return;
      setConfig({
          ...config,
          values: { ...config.values, [key]: newValue }
      });
    };

    const isReadOnly = key.toUpperCase().includes('KEY') || key.toUpperCase().includes('TOKEN') || key.toUpperCase().includes('SECRET');

    let type = 'text';
    if (typeof value === 'boolean' || schema.format === 'Boolean') type = 'boolean';
    else if (typeof value === 'number' || schema.format === 'int' || schema.format === 'Number') type = 'number';
    else if (Array.isArray(value) || schema.format === 'Array') type = 'array';


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

    return (
      <div className="form-control w-full" key={key}>
        <label className="label">
          <span className="label-text font-semibold">{key}</span>
          {schema.env && <span className="label-text-alt badge badge-ghost badge-sm">{schema.env}</span>}
        </label>
        <Input
          type={type === 'number' ? 'number' : 'text'}
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => handleChange(type === 'number' ? Number(e.target.value) : (type === 'array' ? e.target.value.split(',').map((s:string) => s.trim()) : e.target.value))}
          placeholder={isReadOnly ? 'Safe to edit (Hidden)' : (type === 'array' ? 'Comma separated values' : '')}
        />
        {schema.doc && <label className="label"><span className="label-text-alt text-base-content/70">{schema.doc}</span></label>}
      </div>
    );
  };

  if (loading) return (
     <div className="flex flex-col items-center justify-center p-12 gap-4">
        <span className="loading loading-infinity loading-lg text-primary" />
        <span className="text-base-content/50">Loading settings...</span>
    </div>
  );
  
  if (error) return <Alert status="error" message={error} />;
  if (!config) return <div className="alert alert-info">Configuration section '{section}' not found in global config.</div>;

  return (
    <Card className="bg-base-100 shadow-xl border border-base-200">
      <div className="card-body">
         <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
                <h2 className="card-title text-2xl capitalize">{section} Settings</h2>
                <p className="text-base-content/60 text-sm">Configure global defaults for {section}.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isMessageProviderSection && (
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  loading={testing}
                  disabled={testing}
                >
                  Test Connection
                </Button>
              )}
              <Button 
                  variant="primary" 
                  onClick={() => handleSave(config.values)}
                  loading={saving}
                  disabled={saving}
              >
                  Save Changes
              </Button>
            </div>
         </div>

         {success && <div className="mb-4"><Alert status="success" message={success} /></div>}
         {testStatus && (
           <div className="mb-4">
             <Alert status={testStatus.type} message={testStatus.message} />
           </div>
         )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {Object.entries(config.values).map(([key, value]) => {
              // Handle objects
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                 const currentValue = jsonState[key] !== undefined ? jsonState[key] : JSON.stringify(value, null, 2);
                 let isValid = true;
                 try { JSON.parse(currentValue); } catch { isValid = false; }
                 
                 return (
                    <div className="form-control w-full col-span-2" key={key}>
                      <label className="label">
                        <span className="label-text font-semibold">{key}</span>
                        {config.schema[key]?.env && <span className="label-text-alt badge badge-ghost badge-sm">{config.schema[key].env}</span>}
                      </label>
                      <Textarea
                        className="h-32 font-mono text-sm"
                        value={currentValue}
                        onChange={(e) => setJsonState(prev => ({ ...prev, [key]: e.target.value }))}
                        variant={!isValid ? 'error' : undefined}
                        bordered
                      />
                      <label className="label">
                         <span className="label-text-alt text-base-content/70">{config.schema[key]?.doc || 'JSON Configuration Object'}</span>
                         {!isValid && <span className="label-text-alt text-error">Invalid JSON</span>}
                      </label>
                    </div>
                 );
              }
              
              return renderField(key, value, config.schema[key] || {});
          })}
        </div>
      </div>
    </Card>
  );
};

export default GlobalConfigSection;
