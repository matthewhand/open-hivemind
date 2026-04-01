import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Alert } from './DaisyUI/Alert';
import Button from './DaisyUI/Button';
import Card from './DaisyUI/Card';
import Input from './DaisyUI/Input';
import Select from './DaisyUI/Select';
import Toggle from './DaisyUI/Toggle';
import { Loading } from './DaisyUI/Loading';
import Textarea from './DaisyUI/Textarea';
import FormField from './DaisyUI/FormField';
import Debug from 'debug';
import { apiService } from '../services/api';
import { useSavedStamp } from '../contexts/SavedStampContext';
const debug = Debug('app:client:components:GlobalConfigSection');

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

type _GlobalConfig = Record<string, ConfigItem>;

interface GlobalConfigSectionProps {
  section: string;
}

type FormValues = Record<string, any>;

const GlobalConfigSection: React.FC<GlobalConfigSectionProps> = ({ section }) => {
  const [configSchema, setConfigSchema] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [jsonState, setJsonState] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [hasConfig, setHasConfig] = useState(true);
  const { showStamp } = useSavedStamp();

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors: _errors },
  } = useForm<FormValues>({
    defaultValues: {},
  });

  const isMessageProviderSection = ['discord', 'slack', 'mattermost'].includes(section);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: any = await apiService.getGlobalConfig();
      if (data && data[section]) {
        const config = data[section];
        setConfigSchema(config.schema || {});
        setHasConfig(true);
        // Reset the form with fetched values
        reset(config.values || {});
      } else {
        setHasConfig(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  }, [section, reset]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    // Merge any valid JSON state back into values before saving
    const valuesToSave = { ...values };
    Object.entries(jsonState).forEach(([key, jsonStr]) => {
      try {
        valuesToSave[key] = JSON.parse(jsonStr);
      } catch (_e) {
        debug('WARN:', `Skipping invalid JSON for ${section}.${key}`);
      }
    });

    try {
      await apiService.updateGlobalConfig({ configName: section, updates: valuesToSave });
      setSuccess('Configuration saved successfully');
      showStamp();
      await fetchConfig(); // Refresh
      setJsonState({});
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleTestConnection = async () => {
    const values = getValues();
    setTesting(true);
    setTestStatus(null);
    try {
      const data: any = await apiService.post('/api/config/message-provider/test', {
        provider: section,
        config: values,
      });
      if (data.success === false) {
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
    const isReadOnly = key.toUpperCase().includes('KEY') || key.toUpperCase().includes('TOKEN') || key.toUpperCase().includes('SECRET');

    let type = 'text';
    if (typeof value === 'boolean' || schema.format === 'Boolean') { type = 'boolean'; }
    else if (typeof value === 'number' || schema.format === 'int' || schema.format === 'Number') { type = 'number'; }
    else if (Array.isArray(value) || schema.format === 'Array') { type = 'array'; }

    if (type === 'boolean') {
      return (
        <div className="form-control w-full" key={key}>
          <label className="label cursor-pointer justify-start gap-4">
            <span className="label-text font-semibold">{key}</span>
            <Controller
              name={key}
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value === true}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
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
            {...register(key)}
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
        {type === 'number' ? (
          <Input
            type="number"
            {...register(key, { valueAsNumber: true })}
            placeholder={isReadOnly ? 'Safe to edit (Hidden)' : ''}
          />
        ) : type === 'array' ? (
          <Controller
            name={key}
            control={control}
            render={({ field }) => (
              <Input
                type="text"
                value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                onChange={(e) => field.onChange(e.target.value.split(',').map((s: string) => s.trim()))}
                placeholder="Comma separated values"
              />
            )}
          />
        ) : (
          <Input
            type="text"
            {...register(key)}
            placeholder={isReadOnly ? 'Safe to edit (Hidden)' : ''}
          />
        )}
        {schema.doc && <label className="label"><span className="label-text-alt text-base-content/70">{schema.doc}</span></label>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <span className="loading loading-infinity loading-lg text-primary" aria-hidden="true" />
        <span className="text-base-content/50">Loading settings...</span>
      </div>
    );
  }

  if (error) { return <Alert status="error" message={error} />; }
  if (!hasConfig) { return <div className="alert alert-info">Configuration section '{section}' not found in global config.</div>; }

  const currentValues = getValues();

  return (
    <Card className="bg-base-100 shadow-xl border border-base-200">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card-body">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h2 className="card-title text-2xl capitalize">{section} Settings</h2>
              <p className="text-base-content/60 text-sm">Configure global defaults for {section}.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isMessageProviderSection && (
                <Button
                  variant="secondary" className="btn-outline"
                  onClick={handleTestConnection}
                  loading={testing}
                  disabled={testing}
                  type="button"
                >
                  Test Connection
                </Button>
              )}
              <Button
                variant="primary"
                type="submit"
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
            {Object.entries(currentValues).map(([key, value]) => {
              // Handle objects
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const currentJsonValue = jsonState[key] !== undefined ? jsonState[key] : JSON.stringify(value, null, 2);
                let isValid = true;
                try { JSON.parse(currentJsonValue); } catch { isValid = false; }

                return (
                  <div className="form-control w-full col-span-2" key={key}>
                    <label className="label">
                      <span className="label-text font-semibold">{key}</span>
                      {configSchema[key]?.env && <span className="label-text-alt badge badge-ghost badge-sm">{configSchema[key].env}</span>}
                    </label>
                    <Textarea
                      className="h-32 font-mono text-sm"
                      value={currentJsonValue}
                      onChange={(e) => setJsonState(prev => ({ ...prev, [key]: e.target.value }))}
                      variant={!isValid ? 'error' : undefined}
                      bordered
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/70">{configSchema[key]?.doc || 'JSON Configuration Object'}</span>
                      {!isValid && <span className="label-text-alt text-error">Invalid JSON</span>}
                    </label>
                  </div>
                );
              }

              return renderField(key, value, configSchema[key] || {});
            })}
          </div>
        </div>
      </form>
    </Card>
  );
};

export default GlobalConfigSection;
