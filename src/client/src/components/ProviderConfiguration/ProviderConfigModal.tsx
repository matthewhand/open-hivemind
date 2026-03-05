/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import type {
  ProviderModalState,
  ProviderTypeConfig,
  FieldConfig,
} from '../../types/bot';
import {
  MessageProviderType,
  LLMProviderType,
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS,
} from '../../types/bot';
<<<<<<< HEAD
import { Button, Input, Select, Toggle, Textarea } from '../DaisyUI';
=======
import { Button } from '../DaisyUI';
>>>>>>> origin/main
import { X as XIcon } from 'lucide-react';
import { ProviderConfigForm } from '../ProviderConfigForm';
import { getProviderSchema } from '../../provider-configs';

interface ProviderConfigModalProps {
  modalState: ProviderModalState;
  existingProviders?: { name: string }[];
  onClose: () => void;
  onSubmit: (providerData: any) => void;
}

const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  modalState,
  existingProviders,
  onClose,
  onSubmit,
}) => {
  const [selectedType, setSelectedType] = useState<MessageProviderType | LLMProviderType>(
    modalState.providerType === 'message' ? MessageProviderType.DISCORD : LLMProviderType.OPENAI,
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
          ...modalState.provider.config,
        });
      } else {
        // Add mode: start with empty form
        const defaultType = modalState.providerType === 'message'
          ? MessageProviderType.DISCORD
          : LLMProviderType.OPENAI;

<<<<<<< HEAD
        // Only update selectedType if it mismatch or just to be safe (safest to always reset on open/type change)
        // But we need to handle if user changes type via tab.
        // Actually, this effect runs on [modalState.isOpen, modalState.providerType].
        // If user clicks tab, only selectedType changes (which is not in deps? No, selectedType IS in deps).
        // Wait, if selectedType is in deps, setting it triggers effect loop?
        // Let's remove selectedType from deps if we set it?
        // Or conditionally set it if it's invalid for current providerType.

        let newType = selectedType;
=======
>>>>>>> origin/main
        const isCurrentTypeValid = modalState.providerType === 'message'
          ? Object.values(MessageProviderType).includes(selectedType as MessageProviderType)
          : Object.values(LLMProviderType).includes(selectedType as LLMProviderType);

        let newType = selectedType;
        if (!isCurrentTypeValid) {
          newType = defaultType;
          setSelectedType(newType);
        }

        const defaultName = getDefaultName(newType, modalState.providerType as 'message' | 'llm', existingProviders);
        setFormData({
          name: defaultName,
        });
        setErrors({});
      }
    }
<<<<<<< HEAD
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, selectedType, modalState.providerType, existingProviders]);
=======
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, modalState.providerType]);
>>>>>>> origin/main

  const getDefaultName = (
    type: string,
    providerType: 'message' | 'llm',
    currentExistingProviders?: { name: string }[],
  ): string => {
    const configs = providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
    const config = (configs as any)[type];
    const baseName = config?.displayName || config?.name || 'New Provider';

    if (!currentExistingProviders || currentExistingProviders.length === 0) {
      return `${baseName}-1`;
    }

    let counter = 1;
    let newName = `${baseName}-${counter}`;
    while (currentExistingProviders.some((p) => p.name === newName)) {
      counter++;
      newName = `${baseName}-${counter}`;
    }
    return newName;
  };

  const getCurrentConfig = (): ProviderTypeConfig => {
    const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
    return (configs as any)[selectedType];
  };

<<<<<<< HEAD
  const richSchema = getProviderSchema(selectedType);

  const validateField = (field: FieldConfig, value: any): string | null => {
=======
  const validateField = (field: FieldConfig | any, value: any): string | null => {
>>>>>>> origin/main
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

<<<<<<< HEAD
    if (field.validation && value) {
=======
    if (field.validation && value !== undefined && value !== null && value !== '') {
>>>>>>> origin/main
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

<<<<<<< HEAD
      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          // Provide specific error messages for common field types
          if (field.type === 'url') {
            return `${field.label} must be a valid HTTPS URL`;
          }
          return `${field.label} format is invalid`;
        }
=======
      if (field.type === 'text' || field.type === 'password' || field.type === 'url') {
        const strValue = String(value);
        if (min !== undefined && strValue.length < min) {
          return `${field.label} must be at least ${min} characters`;
        }
        if (max !== undefined && strValue.length > max) {
          return `${field.label} must be at most ${max} characters`;
        }
      }

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          // For API keys, don't fail validation in UI, just warn (ProviderConfigForm does this)
          if (field.name === 'apiKey' || field.type === 'password') {
            // Just pass for API Keys
          } else {
            if (field.type === 'url') {
              return `${field.label} must be a valid HTTPS URL`;
            }
            return `${field.label} format is invalid`;
          }
        }
      }

      if (field.validation.custom) {
        const customError = field.validation.custom(value);
        if (customError) { return customError; }
>>>>>>> origin/main
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

<<<<<<< HEAD
    // Validate required fields if not using rich schema, or let the rich schema validate it later
    if (!richSchema) {
      const allFields = config.fields || [];
      allFields.forEach(field => {
        const error = validateField(field, formData[field.name]);
        if (error) {
          newErrors[field.name] = error;
          isValid = false;
        }
      });
    } else {
      // Validate rich schema fields
      richSchema.fields.forEach(field => {
        if (field.required && (!formData[field.name] || (typeof formData[field.name] === 'string' && formData[field.name].trim() === ''))) {
          newErrors[field.name] = `${field.label} is required`;
          isValid = false;
        }
        if (field.validation && formData[field.name]) {
          const { min, max, pattern } = field.validation;
          if (field.type === 'number' && typeof formData[field.name] !== 'undefined') {
            const numVal = Number(formData[field.name]);
            if (min !== undefined && numVal < min) {
              newErrors[field.name] = `${field.label} must be at least ${min}`;
              isValid = false;
            }
            if (max !== undefined && numVal > max) {
              newErrors[field.name] = `${field.label} must be at most ${max}`;
              isValid = false;
            }
          } else if (field.type === 'text' && typeof formData[field.name] === 'string') {
            const len = formData[field.name].length;
            if (min !== undefined && len < min) {
              newErrors[field.name] = `${field.label} must be at least ${min} characters`;
              isValid = false;
            }
            if (max !== undefined && len > max) {
              newErrors[field.name] = `${field.label} must be at most ${max} characters`;
              isValid = false;
            }
          }
        }
      });
    }
=======
    const schema = getProviderSchema(selectedType);
    const allFields = schema ? schema.fields : (config.fields || []);

    // Validate required fields
    allFields.forEach((field: any) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });
>>>>>>> origin/main

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
<<<<<<< HEAD
    const allFields = richSchema ? richSchema.fields : config.fields || [];
    const providerConfig: Record<string, any> = {};

    // Only include fields that have values
    allFields.forEach(field => {
=======
    const schema = getProviderSchema(selectedType);
    const allFields = schema ? schema.fields : (config.fields || []);

    const providerConfig: Record<string, any> = {};

    // Only include fields that have values, and perform casting
    allFields.forEach((field: any) => {
>>>>>>> origin/main
      const value = formData[field.name];
      if (value !== undefined && value !== '') {
        providerConfig[field.name] = field.type === 'number' ? Number(value) : value;
      }
    });

    const providerData = {
      name: formData.name,
      type: selectedType,
      config: providerConfig,
      ...(modalState.isEdit && { id: modalState.provider?.id }),
    };

    onSubmit(providerData);
  };

<<<<<<< HEAD
=======
  const handleProviderConfigChange = (newConfig: Record<string, any>) => {
    setFormData(prev => ({
      ...prev,
      ...newConfig,
    }));
  };

>>>>>>> origin/main
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

<<<<<<< HEAD
    const getLabelNode = (fieldLabel: string, required?: boolean) => (
      <span className="label-text font-medium text-base-content">
        {fieldLabel}
        {required && <span className="text-error ml-1">*</span>}
      </span>
    );

    switch (field.type) {
    case 'password':
      return (
        <div key={field.name} className="mb-4">
          <Input
            type="password"
            label={getLabelNode(field.label, field.required)}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            error={error}
            bordered
            className="w-full"
          />
        </div>
      );

    case 'number':
      return (
        <div key={field.name} className="mb-4">
          <Input
            type="number"
            label={getLabelNode(field.label, field.required)}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.name === 'temperature' ? '0.1' : '1'}
            error={error}
            bordered
            className="w-full"
          />
        </div>
      );

    case 'select':
      return (
        <div key={field.name} className="mb-4 form-control w-full">
          <label className="label pb-1">
            {getLabelNode(field.label, field.required)}
          </label>
          <Select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            error={!!error}
            className="w-full"
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          {error && (
            <label className="label pt-1 pb-0">
              <span className="label-text-alt text-error">{error}</span>
            </label>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div key={field.name} className="mb-4 form-control w-full">
          <label className="label pb-1">
            {getLabelNode(field.label, field.required)}
          </label>
          <Textarea
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={4}
            className={`w-full ${error ? 'textarea-error' : ''}`}
            bordered
          />
          {error && (
            <label className="label pt-1 pb-0">
              <span className="label-text-alt text-error">{error}</span>
            </label>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div key={field.name} className="mb-4 form-control w-full">
          <Toggle
            label={field.label}
            checked={!!value}
            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
            color="primary"
          />
          {error && (
            <label className="label pt-1 pb-0">
              <span className="label-text-alt text-error">{error}</span>
            </label>
          )}
        </div>
      );

    default:
      // text and others
      return (
        <div key={field.name} className="mb-4">
          <Input
            type="text"
            label={getLabelNode(field.label, field.required)}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            error={error}
            bordered
            className="w-full"
          />
        </div>
      );
    }
  };

  if (!modalState.isOpen) {return null;}
=======
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

  if (!modalState.isOpen) { return null; }
>>>>>>> origin/main

  // Get ALL configs to iterate types for tabs
  const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
  const providerTypes = Object.keys(configs);
  // Safe config access: if selectedType mismatch, fallback to first in list
  const config = (configs as any)[selectedType] || (configs as any)[providerTypes[0]];
  const allFields = config?.fields || [];

  return (
<<<<<<< HEAD
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl bg-base-100">
=======
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
>>>>>>> origin/main
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

        {/* Provider Type Tabs - flex-wrap and gap-1 fix overlapping tabs in modal */}
        <div
          className="tabs tabs-boxed mb-6 flex-wrap gap-1"
          role="tablist"
          aria-label={`${modalState.providerType === 'message' ? 'Message' : 'LLM'} provider types`}
        >
          {providerTypes.map(type => {
            const typeConfig = (configs as any)[type];
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                className={`tab tab-sm flex items-center gap-2 ${isActive ? 'tab-active' : ''}`}
                onClick={() => setSelectedType(type as MessageProviderType | LLMProviderType)}
                role="tab"
                aria-selected={isActive}
                aria-label={`Select ${typeConfig.displayName || typeConfig.name}`}
              >
                <span>{typeConfig.icon}</span>
                {typeConfig.displayName || typeConfig.name}
              </button>
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
<<<<<<< HEAD
              error={errors.name}
              bordered
              className="w-full"
=======
>>>>>>> origin/main
            />
            {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name}</span></label>}
          </div>

          {/* Provider-specific fields */}
          <div className="space-y-4 mb-6">
<<<<<<< HEAD
            {richSchema ? (
              <ProviderConfigForm
                providerType={selectedType}
                schema={richSchema}
                initialConfig={formData}
                externalErrors={errors}
                onConfigChange={(newConfig) => {
                  setFormData(prev => ({ ...prev, ...newConfig }));
                  // Clear errors when config changes
                  setErrors(prevErrors => {
                    const nextErrors = { ...prevErrors };
                    // Find keys that exist in both previous and new config
                    Object.keys(newConfig).forEach(k => {
                      if (nextErrors[k]) {
                        delete nextErrors[k];
                      }
                    });
                    return nextErrors;
                  });
=======
            {getProviderSchema(selectedType) ? (
              <ProviderConfigForm
                providerType={selectedType}
                schema={getProviderSchema(selectedType)!}
                initialConfig={formData}
                onConfigChange={handleProviderConfigChange}
                externalErrors={errors}
                onTestConnection={async (config) => {
                  // Enhanced test connection with provider-specific validation
                  try {
                    const response = await fetch('/api/v1/admin/providers/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        providerType: selectedType,
                        config,
                      }),
                    });
                    return response.ok;
                  } catch {
                    // Fallback: basic validation if endpoint not available
                    const hasRequiredFields = ['apiKey', 'endpoint', 'baseUrl'].some(
                      key => config[key] && config[key].toString().trim() !== ''
                    );
                    return hasRequiredFields;
                  }
>>>>>>> origin/main
                }}
              />
            ) : (
              allFields.map(renderField)
            )}
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
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
};

export default ProviderConfigModal;
