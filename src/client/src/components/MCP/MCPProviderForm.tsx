import React, { useState, useEffect } from 'react';
import { Alert, Button, Card, Input, Select, Textarea, Toggle, InputGroup, FormLabel } from 'react-daisyui';
import { FaPlus, FaTrash, FaEye, FaEyeSlash, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { MCPProviderConfig, MCPProviderValidationResult } from '../../../types/mcp';
import { ProviderField } from '../../provider-configs/types';

interface MCPProviderFormProps {
  provider?: MCPProviderConfig;
  onSave: (provider: MCPProviderConfig) => void;
  onCancel: () => void;
  templates?: Array<{
    id: string;
    name: string;
    type: 'desktop' | 'cloud';
    description: string;
    command: string;
    args: string[];
    envVars: Record<string, string>;
  }>;
}

interface EnvVar {
  key: string;
  value: string;
  showValue: boolean;
}

const MCPProviderForm: React.FC<MCPProviderFormProps> = ({
  provider,
  onSave,
  onCancel,
  templates = []
}) => {
  const [formData, setFormData] = useState<Partial<MCPProviderConfig>>({
    name: '',
    type: 'desktop',
    description: '',
    command: '',
    args: '',
    env: {},
    timeout: 30,
    autoRestart: true,
    healthCheck: {
      enabled: true,
      interval: 60,
      timeout: 10,
      retries: 3
    },
    enabled: true,
    ...provider
  });

  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [validation, setValidation] = useState<MCPProviderValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
    suggestions: []
  });

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Convert env object to envVars array
    if (formData.env) {
      const vars = Object.entries(formData.env).map(([key, value]) => ({
        key,
        value,
        showValue: false
      }));
      setEnvVars(vars.length > 0 ? vars : [{ key: '', value: '', showValue: false }]);
    } else {
      setEnvVars([{ key: '', value: '', showValue: false }]);
    }

    validateForm();
  }, [formData.env]);

  const validateForm = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('Provider name is required and must be at least 2 characters');
    }

    // Command validation
    if (!formData.command || formData.command.trim().length === 0) {
      errors.push('Command is required');
    } else {
      const command = formData.command.trim();
      const validCommandPatterns = [
        /^[a-zA-Z0-9\\-_]+$/,
        /^\.\/[a-zA-Z0-9\\-_\\/.]+$/,
        /^\/[a-zA-Z0-9\\-_\\/.]+$/,
        /^[a-zA-Z]:\\[a-zA-Z0-9\\-_\\/.\\]+$/,
        /^npx [a-zA-Z0-9@/.\\-]+$/,
        /^npm run [a-zA-Z0-9\\-_]+$/,
        /^yarn [a-zA-Z0-9\\-_]+$/,
        /^python(3)? -m [a-zA-Z0-9._\\-]+$/
      ];

      const isValidCommand = validCommandPatterns.some(pattern => pattern.test(command));
      if (!isValidCommand) {
        errors.push('Invalid command format. Use: npx package-name, python -m module, ./relative-path, or /absolute-path');
      }
    }

    // Args validation
    if (formData.args && typeof formData.args === 'string') {
      try {
        // Try to parse as JSON array
        JSON.parse(formData.args);
      } catch {
        // If not JSON, ensure it's not empty if provided
        if (formData.args.trim().length === 0) {
          warnings.push('Arguments field is empty');
        }
      }
    }

    // Cloud provider warnings
    if (formData.type === 'cloud') {
      const envVars = formData.env || {};
      const hasConnectionConfig = Object.keys(envVars).some(key =>
        key.toLowerCase().includes('url') ||
        key.toLowerCase().includes('endpoint') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token')
      );

      if (!hasConnectionConfig) {
        warnings.push('Cloud providers typically require connection configuration (URLs, API keys, etc.)');
      }
    }

    // Timeout validation
    if (formData.timeout !== undefined) {
      if (typeof formData.timeout !== 'number' || formData.timeout < 5 || formData.timeout > 300) {
        errors.push('Timeout must be a number between 5 and 300 seconds');
      }
    }

    // Health check validation
    if (formData.healthCheck?.enabled) {
      if (formData.healthCheck.interval < 10 || formData.healthCheck.interval > 3600) {
        errors.push('Health check interval must be between 10 and 3600 seconds');
      }
      if (formData.healthCheck.timeout < 1 || formData.healthCheck.timeout > 60) {
        errors.push('Health check timeout must be between 1 and 60 seconds');
      }
    }

    // Suggestions
    if (formData.type === 'desktop' && (!formData.args || formData.args.trim().length === 0)) {
      suggestions.push('Consider adding arguments like "--port 3000" for local MCP servers');
    }

    if (!formData.healthCheck?.enabled) {
      suggestions.push('Consider enabling health checks for better reliability');
    }

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    });
  };

  useEffect(() => {
    validateForm();
  }, [formData]);

  const handleInputChange = (field: keyof MCPProviderConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index] = { ...newEnvVars[index], [field]: value };
    setEnvVars(newEnvVars);

    // Update env object
    const env: Record<string, string> = {};
    newEnvVars.forEach(envVar => {
      if (envVar.key.trim()) {
        env[envVar.key.trim()] = envVar.value;
      }
    });
    handleInputChange('env', env);
  };

  const addEnvVar = () => {
    setEnvVars(prev => [...prev, { key: '', value: '', showValue: false }]);
  };

  const removeEnvVar = (index: number) => {
    const newEnvVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newEnvVars);

    // Update env object
    const env: Record<string, string> = {};
    newEnvVars.forEach(envVar => {
      if (envVar.key.trim()) {
        env[envVar.key.trim()] = envVar.value;
      }
    });
    handleInputChange('env', env);
  };

  const toggleEnvVarVisibility = (index: number) => {
    const newEnvVars = [...envVars];
    newEnvVars[index] = { ...newEnvVars[index], showValue: !newEnvVars[index].showValue };
    setEnvVars(newEnvVars);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData({
          name: template.name,
          type: template.type,
          description: template.description,
          command: template.command,
          args: JSON.stringify(template.args),
          env: template.envVars,
          timeout: 30,
          autoRestart: true,
          healthCheck: {
            enabled: true,
            interval: 60,
            timeout: 10,
            retries: 3
          },
          enabled: false
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.isValid) {
      return;
    }

    const providerData: MCPProviderConfig = {
      id: provider?.id || `mcp-${Date.now()}`,
      name: formData.name || '',
      type: formData.type as 'desktop' | 'cloud',
      description: formData.description,
      command: formData.command || '',
      args: formData.args,
      env: formData.env || {},
      timeout: formData.timeout || 30,
      autoRestart: formData.autoRestart || false,
      healthCheck: formData.healthCheck,
      enabled: formData.enabled || false
    };

    onSave(providerData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-base-100 shadow-lg">
        <Card.Body className="p-8">
          <Card.Title className="text-2xl mb-6">
            {provider ? 'Edit MCP Provider' : 'Create MCP Provider'}
          </Card.Title>

          {/* Template Selection */}
          {templates.length > 0 && !provider && (
            <div className="mb-6">
              <FormLabel>Start from Template (Optional)</FormLabel>
              <Select
                className="w-full"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.type}) - {template.description}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="form-control">
                <FormLabel className="label">
                  <span className="label-text font-medium">Provider Name *</span>
                </FormLabel>
                <Input
                  type="text"
                  placeholder="e.g., File System Access, Web Scraper"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full"
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">A descriptive name for this MCP provider</span>
                </label>
              </div>

              {/* Type */}
              <div className="form-control">
                <FormLabel className="label">
                  <span className="label-text font-medium">Provider Type *</span>
                </FormLabel>
                <Select
                  className="w-full"
                  value={formData.type || 'desktop'}
                  onChange={(e) => handleInputChange('type', e.target.value as 'desktop' | 'cloud')}
                >
                  <option value="desktop">Desktop - Local MCP server</option>
                  <option value="cloud">Cloud - Remote MCP server</option>
                </Select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Desktop: runs locally | Cloud: connects to remote service
                  </span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="form-control">
              <FormLabel className="label">
                <span className="label-text font-medium">Description</span>
              </FormLabel>
              <Textarea
                placeholder="Optional description of what this MCP provider does"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full h-24"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Command */}
              <div className="form-control">
                <FormLabel className="label">
                  <span className="label-text font-medium">Command *</span>
                </FormLabel>
                <Input
                  type="text"
                  placeholder="e.g., npx, python, node, ./my-server"
                  value={formData.command || ''}
                  onChange={(e) => handleInputChange('command', e.target.value)}
                  className="w-full"
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Use: npx package-name, python -m module, ./relative-path, or /absolute/path
                  </span>
                </label>
              </div>

              {/* Arguments */}
              <div className="form-control">
                <FormLabel className="label">
                  <span className="label-text font-medium">Arguments</span>
                </FormLabel>
                <Input
                  type="text"
                  placeholder='e.g., --port 3000 or ["--port", "3000"]'
                  value={formData.args || ''}
                  onChange={(e) => handleInputChange('args', e.target.value)}
                  className="w-full"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Space-separated or JSON array format
                  </span>
                </label>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="form-control">
              <FormLabel className="label">
                <span className="label-text font-medium">Environment Variables</span>
              </FormLabel>
              <div className="space-y-3">
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Variable name"
                      value={envVar.key}
                      onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <div className="relative flex-1">
                      <Input
                        type={envVar.showValue ? 'text' : 'password'}
                        placeholder="Variable value"
                        value={envVar.value}
                        onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                        className="w-full pr-10"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1 h-8 w-8"
                        onClick={() => toggleEnvVarVisibility(index)}
                      >
                        {envVar.showValue ? <FaEyeSlash className="w-3 h-3" /> : <FaEye className="w-3 h-3" />}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      color="error"
                      variant="outline"
                      onClick={() => removeEnvVar(index)}
                    >
                      <FaTrash className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addEnvVar}
                  className="w-full"
                >
                  <FaPlus className="w-3 h-3 mr-1" />
                  Add Environment Variable
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timeout */}
              <div className="form-control">
                <FormLabel className="label">
                  <span className="label-text font-medium">Timeout (seconds)</span>
                </FormLabel>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.timeout || ''}
                  onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 30)}
                  min="5"
                  max="300"
                  className="w-full"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">Maximum time to wait for startup</span>
                </label>
              </div>

              {/* Auto Restart */}
              <div className="form-control">
                <FormLabel className="label">
                  <span className="label-text font-medium">Auto Restart</span>
                </FormLabel>
                <div className="flex items-center gap-3 mt-3">
                  <Toggle
                    checked={formData.autoRestart || false}
                    onChange={(e) => handleInputChange('autoRestart', e.target.checked)}
                  />
                  <span className="text-sm">Automatically restart if the provider crashes</span>
                </div>
              </div>
            </div>

            {/* Health Check */}
            <div className="form-control">
              <FormLabel className="label">
                <span className="label-text font-medium">Health Check Configuration</span>
              </FormLabel>
              <div className="bg-base-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={formData.healthCheck?.enabled || false}
                    onChange={(e) => handleInputChange('healthCheck', {
                      ...formData.healthCheck,
                      enabled: e.target.checked
                    })}
                  />
                  <span className="text-sm font-medium">Enable Health Check</span>
                </div>

                {formData.healthCheck?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="label">
                        <span className="label-text text-sm">Check Interval (seconds)</span>
                      </label>
                      <Input
                        type="number"
                        value={formData.healthCheck.interval || 60}
                        onChange={(e) => handleInputChange('healthCheck', {
                          ...formData.healthCheck,
                          interval: parseInt(e.target.value) || 60
                        })}
                        min="10"
                        max="3600"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text text-sm">Timeout (seconds)</span>
                      </label>
                      <Input
                        type="number"
                        value={formData.healthCheck.timeout || 10}
                        onChange={(e) => handleInputChange('healthCheck', {
                          ...formData.healthCheck,
                          timeout: parseInt(e.target.value) || 10
                        })}
                        min="1"
                        max="60"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enabled */}
            <div className="form-control">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={formData.enabled || false}
                  onChange={(e) => handleInputChange('enabled', e.target.checked)}
                />
                <span className="text-sm font-medium">Enable this provider for use with bots</span>
              </div>
            </div>

            {/* Validation Messages */}
            {validation.errors.length > 0 && (
              <Alert status="error" className="mb-4">
                <FaExclamationTriangle className="w-4 h-4" />
                <div>
                  <p className="font-medium mb-1">Please fix the following errors:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <Alert status="warning" className="mb-4">
                <FaInfoCircle className="w-4 h-4" />
                <div>
                  <p className="font-medium mb-1">Warnings:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

            {validation.suggestions.length > 0 && (
              <Alert status="info" className="mb-4">
                <FaInfoCircle className="w-4 h-4" />
                <div>
                  <p className="font-medium mb-1">Suggestions:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validation.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-base-300">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={!validation.isValid || isLoading}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : null}
                {provider ? 'Save Changes' : 'Create Provider'}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MCPProviderForm;