import React, { useState, useEffect } from 'react';
import type { ProviderConfigFormProps, ProviderConfigField } from '../provider-configs/types';
import Input from './DaisyUI/Input';
import Select from './DaisyUI/Select';
import Textarea from './DaisyUI/Textarea';
import Toggle from './DaisyUI/Toggle';
import Button from './DaisyUI/Button';
import { Alert } from './DaisyUI/Alert';
import Badge from './DaisyUI/Badge';
import Card from './DaisyUI/Card';
import ModelAutocomplete from './DaisyUI/ModelAutocomplete';
import Debug from 'debug';
import { getApiKeyFormatHint } from '../utils/apiKeyValidation';
const debug = Debug('app:client:components:ProviderConfigForm');

interface FieldError {
  [fieldName: string]: string;
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  schema,
  initialConfig = {},
  onConfigChange,
  onTestConnection,
  onAvatarLoad,
  externalErrors = {},
}) => {
  const [config, setConfig] = useState<Record<string, any>>(() => ({
    ...schema.defaultConfig,
    ...initialConfig,
  }));
  const [errors, setErrors] = useState<FieldError>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Group fields by their group property
  const groupedFields = schema.fields.reduce((groups, field) => {
    const groupName = field.group || 'General';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(field);
    return groups;
  }, {} as Record<string, ProviderConfigField[]>);

  const validateField = (field: ProviderConfigField, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${field.label} is required`;
    }

    if (field.validation && value !== undefined && value !== null && value !== '') {
      const { min, max, pattern } = field.validation;

      if (field.type === 'number' || field.type === 'text') {
        if (min !== undefined && Number(value) < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && Number(value) > max) {
          return `${field.label} must be at most ${max}`;
        }
      }

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          // For API keys, show warnings instead of errors to support third-party providers
          if (field.name === 'apiKey' || field.type === 'password') {
            debug('WARN:', `${field.label} format warning: Pattern validation failed for value starting with ${value.substring(0, 8)}...`);
            // Don't return error for API keys - just warn
          } else {
            return `${field.label} format is invalid`;
          }
        }
      }

      if (field.validation.custom) {
        const customError = field.validation.custom(value);
        if (customError) {return customError;}
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    const newConfig = { ...config, [fieldName]: value };
    setConfig(newConfig);

    // Clear errors for this field
    const newErrors = { ...errors };
    delete newErrors[fieldName];
    setErrors(newErrors);

    // Validate field
    const field = schema.fields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, value);
      if (error) {
        newErrors[fieldName] = error;
        setErrors(newErrors);
      }
    }

    onConfigChange(newConfig);
    setTestResult(null);
    setAvatarUrl(null);
  };

  const handleTestConnection = async () => {
    // Validate all required fields
    const newErrors: FieldError = {};
    let hasErrors = false;

    for (const field of schema.fields) {
      if (field.required) {
        const error = validateField(field, config[field.name]);
        if (error) {
          newErrors[field.name] = error;
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    if (!onTestConnection) {return;}

    // Create new AbortController for this test
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setTestResult(null);

    try {
      const success = await onTestConnection(config, controller.signal);
      if (!controller.signal.aborted) {
        setTestResult({
          success,
          message: success ? 'Connection successful!' : 'Connection failed',
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setTestResult({
          success: false,
          message: error instanceof Error ? error.message : 'Connection test failed',
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setAbortController(null);
      }
    }
  };

  const handleCancelTest = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setTestResult({
        success: false,
        message: 'Connection test cancelled',
      });
    }
  };

  const handleLoadAvatar = async () => {
    if (!onAvatarLoad) {return;}

    setIsLoading(true);
    setAvatarUrl(null);

    try {
      const url = await onAvatarLoad(config);
      setAvatarUrl(url);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load avatar',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: ProviderConfigField) => {
    const value = config[field.name] ?? field.defaultValue ?? '';
    const error = externalErrors[field.name] || errors[field.name];

    const baseInputClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2';
    const errorClasses = error ? 'border-error focus:ring-error' : 'border-base-300 focus:ring-primary';
    const inputClasses = `${baseInputClasses} ${errorClasses}`;

    const renderInput = () => {
      switch (field.type) {
      case 'password':
        return (
          <Input
            type="password"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={inputClasses}
            aria-label={`${field.label} password input`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.validation?.min && field.validation?.min < 1 ? '0.1' : '1'}
            className={inputClasses}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={inputClasses}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={inputClasses}
            options={field.options?.map((option) => ({
              label: option.label,
              value: option.value,
            })) || []}
          />
        );

      case 'multiselect':
        return (
          <Select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              const selectedOptions = Array.from(target.selectedOptions, option => option.value);
              handleFieldChange(field.name, selectedOptions);
            }}
            className={`${inputClasses} h-24`}
            options={field.options?.map((option) => ({
              label: option.label,
              value: option.value,
            })) || []}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center h-full">
            <Toggle
              color="primary"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              label="Enable"
            />
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={inputClasses}
          />
        );

      case 'json':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(field.name, parsed);
              } catch {
                handleFieldChange(field.name, e.target.value);
              }
            }}
            placeholder={field.placeholder || '{"key": "value"}'}
            rows={4}
            className={`${inputClasses} font-mono text-sm`}
          />
        );

      case 'model-autocomplete': {
        const Component = field.component || ModelAutocomplete;
        return (
          <Component
            value={typeof value === 'string' ? value : ''}
            onChange={(newValue: any) => handleFieldChange(field.name, newValue)}
            apiKey={config.apiKey}
            baseUrl={config.baseUrl || config.apiUrl || config.endpoint}
            providerType={(field.componentProps?.providerType || schema.providerType) as any}
            onValidationError={(error: string) => {
              // Show validation warnings instead of errors for API keys
              if (field.name === 'apiKey') {
                debug('WARN:', `API Key validation warning: ${error}`);
              } else {
                setErrors(prev => ({ ...prev, [field.name]: error }));
              }
            }}
            onValidationSuccess={() => {
              setErrors(prev => {
                const { [field.name]: _removed, ...rest } = prev;
                return rest;
              });
            }}
            {...field.componentProps}
          />
        );
      }

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={inputClasses}
            aria-label={`${field.label} text input`}
          />
        );
      }
    };

    // Get format hint for API key fields
    const formatHint = (field.name === 'apiKey' || field.name === 'botToken') && schema.providerType
      ? getApiKeyFormatHint(schema.providerType)
      : null;

    return (
      <div className="space-y-1">
        {renderInput()}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
        {!error && formatHint && (field.type === 'password' || field.name === 'apiKey' || field.name === 'botToken') && (
          <p className="text-xs text-base-content/50 mt-1 italic">{formatHint}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Provider Header */}
      <div className="flex items-center space-x-3 pb-4 border-b">
        <span className="text-2xl">{schema.icon}</span>
        <div>
          <h3 className="text-lg font-semibold text-base-content">{schema.displayName}</h3>
          <p className="text-sm text-base-content/70">{schema.description}</p>
        </div>
      </div>

      {/* Form Fields by Group */}
      {Object.entries(groupedFields).map(([groupName, fields]) => (
        <Card key={groupName} className="shadow-sm border border-base-200">
          <Card.Body className="card-body p-6">
            <Card.Title tag="h3" className="text-lg border-b border-base-200 pb-3 mb-4">
              {groupName}
            </Card.Title>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-1/3 text-sm font-semibold text-base-content/70">Setting</th>
                    <th className="w-2/3 text-sm font-semibold text-base-content/70">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(field => (
                    <tr key={field.name} className="hover:bg-base-200/50 transition-colors">
                      <td className="align-top py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base-content/90">
                              {field.label}
                            </span>
                            {field.required ? (
                              <Badge variant="error" size="sm" className="text-[10px] h-4">Required</Badge>
                            ) : (
                              <Badge variant="ghost" size="sm" className="text-[10px] h-4">Optional</Badge>
                            )}
                          </div>
                          {field.description && (
                            <span className="text-xs text-base-content/60 leading-tight">
                              {field.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="align-top py-4">
                        {renderField(field)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      ))}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        {onTestConnection && (
          <>
            <Button
              variant="primary"
              onClick={handleTestConnection}
              loading={isLoading && !abortController}
              disabled={isLoading && !abortController}
            >
              Test Connection
            </Button>
            {isLoading && abortController && (
              <Button
                variant="error"
                onClick={handleCancelTest}
              >
                Cancel Test
              </Button>
            )}
          </>
        )}

        {onAvatarLoad && schema.providerType !== 'webhook' && (
          <Button
            variant="secondary"
            onClick={handleLoadAvatar}
            loading={isLoading && !abortController}
            disabled={isLoading && !abortController}
          >
            Load Avatar
          </Button>
        )}
      </div>

      {/* Results - aria-live region for screen readers to announce test results */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {testResult && testResult.message}
      </div>
      {testResult && (
        <Alert
          status={testResult.success ? 'success' : 'error'}
          message={testResult.message}
        />
      )}

      {avatarUrl && (
        <div className="p-3 bg-base-200 border border-base-300 rounded-lg">
          <p className="text-sm text-base-content/80 mb-2">Avatar loaded successfully:</p>
          <img src={avatarUrl} alt="Provider avatar" className="w-12 h-12 rounded-full" />
        </div>
      )}
    </div>
  );
};
