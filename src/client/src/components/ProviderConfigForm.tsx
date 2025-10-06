import React, { useState, useEffect } from 'react';
import type { ProviderConfigFormProps, ProviderConfigField } from '../provider-configs/types';

interface FieldError {
  [fieldName: string]: string;
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  schema,
  initialConfig = {},
  onConfigChange,
  onTestConnection,
  onAvatarLoad
}) => {
  const [config, setConfig] = useState<Record<string, any>>(() => ({
    ...schema.defaultConfig,
    ...initialConfig
  }));
  const [errors, setErrors] = useState<FieldError>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
            console.warn(`${field.label} format warning: Pattern validation failed for value starting with ${value.substring(0, 8)}...`);
            // Don't return error for API keys - just warn
          } else {
            return `${field.label} format is invalid`;
          }
        }
      }

      if (field.validation.custom) {
        const customError = field.validation.custom(value);
        if (customError) return customError;
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

    if (!onTestConnection) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      const success = await onTestConnection(config);
      setTestResult({
        success,
        message: success ? 'Connection successful!' : 'Connection failed'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAvatar = async () => {
    if (!onAvatarLoad) return;

    setIsLoading(true);
    setAvatarUrl(null);

    try {
      const url = await onAvatarLoad(config);
      setAvatarUrl(url);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to load avatar'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: ProviderConfigField) => {
    const value = config[field.name] ?? field.defaultValue ?? '';
    const error = errors[field.name];

    const baseInputClasses = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2";
    const errorClasses = error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500";
    const inputClasses = `${baseInputClasses} ${errorClasses}`;

    const renderInput = () => {
      switch (field.type) {
        case 'password':
          return (
            <input
              type="password"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={inputClasses}
            />
          );

        case 'number':
          return (
            <input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              step={field.validation?.min && field.validation?.min < 1 ? "0.1" : "1"}
              className={inputClasses}
            />
          );

        case 'url':
          return (
            <input
              type="url"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={inputClasses}
            />
          );

        case 'select':
          return (
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={inputClasses}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );

        case 'multiselect':
          return (
            <select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                handleFieldChange(field.name, selectedOptions);
              }}
              className={`${inputClasses} h-24`}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );

        case 'boolean':
          return (
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable</span>
            </label>
          );

        case 'textarea':
          return (
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={inputClasses}
            />
          );

        case 'json':
          return (
            <textarea
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

        case 'model-autocomplete':
          if (field.component) {
            const Component = field.component;
            return (
              <Component
                value={value}
                onChange={(newValue: any) => handleFieldChange(field.name, newValue)}
                apiKey={config.apiKey}
                baseUrl={config.baseUrl || config.endpoint}
                onValidationError={(error: string) => {
                  // Show validation warnings instead of errors for API keys
                  if (field.name === 'apiKey') {
                    console.warn(`API Key validation warning: ${error}`);
                  } else {
                    setErrors(prev => ({ ...prev, [field.name]: error }));
                  }
                }}
                onValidationSuccess={() => {
                  setErrors(prev => {
                    const { [field.name]: removed, ...rest } = prev;
                    return rest;
                  });
                }}
                {...field.componentProps}
              />
            );
          }
          break;

        default:
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={inputClasses}
            />
          );
      }
    };

    return (
      <div key={field.name} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {renderInput()}
        {field.description && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
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
          <h3 className="text-lg font-semibold text-gray-900">{schema.displayName}</h3>
          <p className="text-sm text-gray-600">{schema.description}</p>
        </div>
      </div>

      {/* Form Fields by Group */}
      {Object.entries(groupedFields).map(([groupName, fields]) => (
        <div key={groupName} className="space-y-4">
          <h4 className="text-md font-medium text-gray-800 border-b pb-2">
            {groupName}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {fields.map(renderField)}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        {onTestConnection && (
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>
        )}

        {onAvatarLoad && schema.providerType !== 'webhook' && (
          <button
            type="button"
            onClick={handleLoadAvatar}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load Avatar'}
          </button>
        )}
      </div>

      {/* Results */}
      {testResult && (
        <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {testResult.message}
          </p>
        </div>
      )}

      {avatarUrl && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">Avatar loaded successfully:</p>
          <img src={avatarUrl} alt="Provider avatar" className="w-12 h-12 rounded-full" />
        </div>
      )}
    </div>
  );
};
