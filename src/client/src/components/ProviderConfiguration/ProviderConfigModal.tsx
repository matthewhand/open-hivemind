import React, { useState, useEffect } from 'react';
import {
  ProviderModalState,
  MessageProviderType,
  LLMProviderType,
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS,
  ProviderTypeConfig,
  FieldConfig
} from '../../types/bot';
import { Button } from '../DaisyUI';
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
    modalState.providerType === 'message' ? MessageProviderType.DISCORD : LLMProviderType.OPENAI
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
        const defaultType = modalState.providerType === 'message'
          ? MessageProviderType.DISCORD
          : LLMProviderType.OPENAI;

        // Only update selectedType if it mismatch or just to be safe (safest to always reset on open/type change)
        // But we need to handle if user changes type via tab. 
        // Actually, this effect runs on [modalState.isOpen, modalState.providerType]. 
        // If user clicks tab, only selectedType changes (which is not in deps? No, selectedType IS in deps).
        // Wait, if selectedType is in deps, setting it triggers effect loop?
        // Let's remove selectedType from deps if we set it?
        // Or conditionally set it if it's invalid for current providerType.

        let newType = selectedType;
        const isCurrentTypeValid = modalState.providerType === 'message'
          ? Object.values(MessageProviderType).includes(selectedType as MessageProviderType)
          : Object.values(LLMProviderType).includes(selectedType as LLMProviderType);

        if (!isCurrentTypeValid) {
          newType = defaultType;
          setSelectedType(newType);
        }

        const defaultName = getDefaultName(newType, modalState.providerType as 'message' | 'llm');
        setFormData({
          name: defaultName
        });
        setErrors({});
      }
    }
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, selectedType, modalState.providerType]);

  const getDefaultName = (type: string, providerType: 'message' | 'llm'): string => {
    const configs = providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
    const config = (configs as any)[type];
    return config?.name || 'New Provider';
  };

  const getCurrentConfig = (): ProviderTypeConfig => {
    const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
    return (configs as any)[selectedType];
  };

  const validateField = (field: FieldConfig, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (field.validation && value) {
      const { min, max, pattern } = field.validation;

      if (field.type === 'number') {
        const numValue = Number(value);
        if (min !== undefined && numValue < min) {
          return `${field.label} must be at least ${min}`;
        }
        if (max !== undefined && numValue > max) {
          return `${field.label} must be at most ${max}`;
        }
      }

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
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
    const allFields = config.fields || [];
    allFields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    const config = getCurrentConfig();
    const allFields = config.fields || [];
    const providerConfig: Record<string, any> = {};

    // Only include fields that have values
    allFields.forEach(field => {
      const value = formData[field.name];
      if (value !== undefined && value !== '') {
        providerConfig[field.name] = field.type === 'number' ? Number(value) : value;
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
    const error = errors[field.name];
    const value = formData[field.name] || '';

    const fieldClasses = `
      w-full
      ${error ? 'input-error' : ''}
      ${field.type === 'textarea' ? 'textarea' : 'input'}
      input-bordered
    `;

    switch (field.type) {
      case 'password':
        return (
          <div key={field.name}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <input
              type="password"
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'number':
        return (
          <div key={field.name}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <input
              type="number"
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
              step={field.name === 'temperature' ? '0.1' : '1'}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <select
              className={`${fieldClasses} select`}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <textarea
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              rows={4}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text font-medium">{field.label}</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={!!value}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              />
            </label>
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );

      default:
        // text and others
        return (
          <div key={field.name}>
            <label className="label">
              <span className="label-text font-medium">{field.label}</span>
              {field.required && <span className="label-text-alt text-error">*</span>}
            </label>
            <input
              type="text"
              className={fieldClasses}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
            {error && <label className="label"><span className="label-text-alt text-error">{error}</span></label>}
          </div>
        );
    }
  };

  if (!modalState.isOpen) return null;

  // Get ALL configs to iterate types for tabs
  const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
  const providerTypes = Object.keys(configs);
  // Safe config access: if selectedType mismatch, fallback to first in list
  const config = (configs as any)[selectedType] || (configs as any)[providerTypes[0]];
  const allFields = config?.fields || [];

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
            const typeConfig = (configs as any)[type];
            return (
              <a
                key={type}
                className={`tab tab-sm flex items-center gap-2 ${selectedType === type ? 'tab-active' : ''}`}
                onClick={() => setSelectedType(type as MessageProviderType | LLMProviderType)}
              >
                <span>{typeConfig.icon}</span>
                {typeConfig.displayName || typeConfig.name}
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
              name="name"
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
              onClick={(e: any) => handleSubmit(e)}
            >
              {modalState.isEdit ? 'Update' : 'Submit'} Provider
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProviderConfigModal;