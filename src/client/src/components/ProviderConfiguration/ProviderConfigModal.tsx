import React, { useState, useEffect } from 'react';
import {
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS
} from '../../types/bot';
import type {
  ProviderModalState,
  MessageProvider,
  LLMProvider,
  MessageProviderType,
  LLMProviderType,
  ProviderTypeConfig,
  FieldConfig
} from '../../types/bot';
import { Button, Badge } from '../DaisyUI';
import { X as XIcon } from 'lucide-react';

interface ProviderConfigModalProps {
  modalState: ProviderModalState;
  onClose: () => void;
  onSubmit: (providerData: any) => void;
}

const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  modalState,
  onClose,
  onSubmit
}) => {
  const [selectedType, setSelectedType] = useState<MessageProviderType | LLMProviderType>(
    modalState.providerType === 'message' ? 'discord' : 'openai'
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens or provider changes
  useEffect(() => {
    if (modalState.isOpen) {
      if (modalState.isEdit && modalState.provider) {
        // Edit mode: populate with existing provider data
        setSelectedType(modalState.provider.type as MessageProviderType | LLMProviderType);
        setFormData({
          name: modalState.provider.name,
          ...modalState.provider.config
        });
      } else {
        // Add mode: start with empty form
        setFormData({
          name: getDefaultName(selectedType, modalState.providerType)
        });
        setErrors({});
      }
    }
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, selectedType, modalState.providerType]);

  const getDefaultName = (type: string, providerType: 'message' | 'llm'): string => {
    const configs = providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
    const config = configs[type as keyof typeof configs];
    return config?.name || 'New Provider';
  };

  const getCurrentConfig = (): ProviderTypeConfig => {
    const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
    return configs[selectedType as keyof typeof configs];
  };

  const validateField = (field: FieldConfig, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (field.validation && value) {
      const { min, max, pattern, message } = field.validation;

      if (field.type === 'number') {
        const numValue = Number(value);
        if (min !== undefined && numValue < min) {
          return message || `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && numValue > max) {
          return message || `${field.label} must be at most ${max}`;
        }
      }

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return message || `${field.label} format is invalid`;
        }
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    const config = getCurrentConfig();
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Provider name is required';
      isValid = false;
    }

    // Validate required fields
    const allFields = [...config.requiredFields, ...config.optionalFields];
    allFields.forEach(field => {
      const error = validateField(field, formData[field.key]);
      if (error) {
        newErrors[field.key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const config = getCurrentConfig();
    const allFields = [...config.requiredFields, ...config.optionalFields];
    const providerConfig: Record<string, any> = {};

    // Only include fields that have values
    allFields.forEach(field => {
      const value = formData[field.key];
      if (value !== undefined && value !== '') {
        providerConfig[field.key] = field.type === 'number' ? Number(value) : value;
      }
    });

    const providerData = {
      name: formData.name,
      type: selectedType,
      config: providerConfig,
      ...(modalState.isEdit && { id: modalState.provider?.id })
    };

    onSubmit(providerData);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const renderField = (field: FieldConfig) => {
    const error = errors[field.key];
    const value = formData[field.key] || '';

    const fieldClasses = `
      w-full
      ${error ? 'input-error' : ''}
      ${field.type === 'textarea' ? 'textarea' : 'input'}
      input-bordered
    `;

    switch (field.type) {
      case 'password':
        return (
          <div key={field.key}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <input
              type="password"
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'number':
        return (
          <div key={field.key}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <input
              type="number"
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
              step={field.key === 'temperature' ? '0.1' : '1'}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'select':
        return (
          <div key={field.key}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <select
              className={`${fieldClasses} select`}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <textarea
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              rows={4}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'toggle':
        return (
          <div key={field.key} className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text font-medium">{field.label}</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={value || false}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              />
            </label>
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      default:
        return (
          <div key={field.key}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <input
              type="text"
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );
    }
  };

  if (!modalState.isOpen) return null;

  const config = getCurrentConfig();
  const allFields = [...config.requiredFields, ...config.optionalFields];
  const providerTypes = Object.keys(config);

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {modalState.isEdit ? 'Edit' : 'Add'} {modalState.providerType === 'message' ? 'Message' : 'LLM'} Provider
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Type Tabs */}
        <div className="tabs tabs-boxed mb-6">
          {providerTypes.map(type => {
            const typeConfig = config[type as keyof typeof config];
            return (
              <a
                key={type}
                className={`tab tab-sm flex items-center gap-2 ${selectedType === type ? 'tab-active' : ''}`}
                onClick={() => setSelectedType(type as MessageProviderType | LLMProviderType)}
              >
                <span>{typeConfig.icon}</span>
                {typeConfig.name}
              </a>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Provider Name */}
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">Provider Name</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              placeholder="Enter a descriptive name for this provider"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
            {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name}</span></label>}
          </div>

          {/* Provider-specific fields */}
          <div className="space-y-4 mb-6">
            {allFields.map(renderField)}
          </div>

          {/* Actions */}
          <div className="modal-action">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {modalState.isEdit ? 'Update' : 'Add'} Provider
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderConfigModal;
