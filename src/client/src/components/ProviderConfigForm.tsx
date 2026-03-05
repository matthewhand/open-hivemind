/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import type { ProviderConfigFormProps, ProviderConfigField } from '../provider-configs/types';
import { Input, Select, Textarea, Toggle, Button, Alert, Badge } from './DaisyUI';

// OpenAI Model Pricing Data (per 1K tokens)
interface ModelPricing {
  input: number;
  output: number;
  contextWindow: number;
  description: string;
  features: string[];
}

const OPENAI_MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': {
    input: 0.0025,
    output: 0.01,
    contextWindow: 128000,
    description: 'Most capable multimodal model',
    features: ['Vision', 'Function Calling', 'JSON Mode'],
  },
  'gpt-4o-mini': {
    input: 0.00015,
    output: 0.0006,
    contextWindow: 128000,
    description: 'Fast, affordable small model for focused tasks',
    features: ['Vision', 'Function Calling', 'JSON Mode'],
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
    contextWindow: 128000,
    description: 'High-intelligence GPT-4 model',
    features: ['Vision', 'Function Calling'],
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
    contextWindow: 16385,
    description: 'Cost-effective for everyday tasks',
    features: ['Function Calling', 'JSON Mode'],
  },
  'o1-preview': {
    input: 0.015,
    output: 0.06,
    contextWindow: 128000,
    description: 'Advanced reasoning for complex problems',
    features: ['Chain of Thought', 'Complex Reasoning'],
  },
  'o1-mini': {
    input: 0.003,
    output: 0.012,
    contextWindow: 128000,
    description: 'Fast reasoning for coding and math',
    features: ['Chain of Thought', 'Coding Focus'],
  },
};

// Model Cost Estimator Component
interface ModelCostEstimatorProps {
  selectedModel: string;
  estimatedInputTokens?: number;
  estimatedOutputTokens?: number;
}

const ModelCostEstimator: React.FC<ModelCostEstimatorProps> = ({
  selectedModel,
  estimatedInputTokens = 1000,
  estimatedOutputTokens = 500,
}) => {
  const [inputTokens, setInputTokens] = useState(estimatedInputTokens);
  const [outputTokens, setOutputTokens] = useState(estimatedOutputTokens);
  const pricing = OPENAI_MODEL_PRICING[selectedModel];

  if (!pricing) {
    return (
      <div className="alert alert-info alert-sm">
        <span>💡 Select a model to see pricing estimates</span>
      </div>
    );
  }

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return (
    <div className="bg-base-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          💰 Cost Estimator
          <Badge variant="ghost" size="small">per request</Badge>
        </h4>
        <span className="text-lg font-bold text-success">${totalCost.toFixed(4)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-base-100 rounded p-2">
          <div className="text-base-content/60">Input</div>
          <div className="font-medium">${inputCost.toFixed(4)}</div>
          <div className="text-base-content/40">{pricing.input}/1K tokens</div>
        </div>
        <div className="bg-base-100 rounded p-2">
          <div className="text-base-content/60">Output</div>
          <div className="font-medium">${outputCost.toFixed(4)}</div>
          <div className="text-base-content/40">{pricing.output}/1K tokens</div>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-base-content/60">Input Tokens: {inputTokens}</label>
          <input
            type="range"
            min="100"
            max="8000"
            step="100"
            value={inputTokens}
            onChange={(e) => setInputTokens(Number(e.target.value))}
            className="range range-xs range-primary w-full"
          />
        </div>
        <div>
          <label className="text-xs text-base-content/60">Output Tokens: {outputTokens}</label>
          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Number(e.target.value))}
            className="range range-xs range-secondary w-full"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-base-300">
        <div className="text-xs text-base-content/60 mb-1">Context Window</div>
        <div className="flex items-center gap-2">
          <progress
            className="progress progress-info w-full"
            value={inputTokens + outputTokens}
            max={pricing.contextWindow}
          />
          <span className="text-xs whitespace-nowrap">
            {((inputTokens + outputTokens) / pricing.contextWindow * 100).toFixed(1)}%
          </span>
        </div>
        <div className="text-xs text-base-content/40 mt-1">
          {pricing.contextWindow.toLocaleString()} tokens max
        </div>
      </div>

      <div className="flex flex-wrap gap-1 pt-1">
        {pricing.features.map((feature) => (
          <Badge key={feature} variant="primary" size="small" className="text-[10px]">
            {feature}
          </Badge>
        ))}
      </div>
    </div>
  );
};

// Model Comparison Helper
const getModelRecommendation = (useCase: string): string => {
  const recommendations: Record<string, string> = {
    'cost-optimized': 'gpt-4o-mini',
    'balanced': 'gpt-4o',
    'high-quality': 'gpt-4-turbo',
    'reasoning': 'o1-preview',
    'coding': 'o1-mini',
    'legacy': 'gpt-3.5-turbo',
  };
  return recommendations[useCase] || 'gpt-4o';
};

interface FieldError {
  [fieldName: string]: string;
}

export const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  schema,
  initialConfig = {},
  onConfigChange,
  onTestConnection,
  onAvatarLoad,
<<<<<<< HEAD
=======
  externalErrors,
>>>>>>> origin/main
}) => {
  const [config, setConfig] = useState<Record<string, any>>(() => ({
    ...schema.defaultConfig,
    ...initialConfig,
  }));
  const [errors, setErrors] = useState<FieldError>({});

  useEffect(() => {
    if (externalErrors) {
      setErrors(prev => ({ ...prev, ...externalErrors }));
    }
  }, [externalErrors]);
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
        if (customError) { return customError; }
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

    if (!onTestConnection) { return; }

    setIsLoading(true);
    setTestResult(null);

    try {
      const success = await onTestConnection(config);
      setTestResult({
        success,
        message: success ? 'Connection successful!' : 'Connection failed',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAvatar = async () => {
    if (!onAvatarLoad) { return; }

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
<<<<<<< HEAD
    const error = errors[field.name];
=======
    const error = errors[field.name] || (externalErrors && externalErrors[field.name]);
>>>>>>> origin/main

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

    return (
      <div className="space-y-1">
        {renderInput()}
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
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
        <div key={groupName} className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-6">
            <h3 className="card-title text-lg border-b border-base-200 pb-3 mb-4">
              {groupName}
            </h3>
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
          </div>
        </div>
      ))}

      {/* Model Cost Estimator for OpenAI */}
      {schema.providerType === 'openai' && config.model && (
        <div className="pt-4 border-t">
          <ModelCostEstimator
            selectedModel={config.model}
            estimatedInputTokens={1000}
            estimatedOutputTokens={500}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        {onTestConnection && (
          <Button
            variant="primary"
            onClick={handleTestConnection}
            loading={isLoading}
            disabled={isLoading}
          >
            Test Connection
          </Button>
        )}

        {onAvatarLoad && schema.providerType !== 'webhook' && (
          <Button
            variant="secondary"
            onClick={handleLoadAvatar}
            loading={isLoading}
            disabled={isLoading}
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