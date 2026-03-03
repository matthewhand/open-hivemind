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
import { Button, Input, Select, Toggle, Textarea } from '../DaisyUI';
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

        const defaultName = getDefaultName(newType, modalState.providerType as 'message' | 'llm', existingProviders);
        setFormData({
          name: defaultName,
        });
        setErrors({});
      }
    }
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, selectedType, modalState.providerType, existingProviders]);

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

  const validateField = (field: FieldConfig | any, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} is required`;
    }

    if (field.validation && value !== undefined && value !== null && value !== '') {
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
    const schema = getProviderSchema(selectedType);
    const allFields = schema ? schema.fields : (config.fields || []);

    const providerConfig: Record<string, any> = {};

    // Only include fields that have values, and perform casting
    allFields.forEach((field: any) => {
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

  const handleProviderConfigChange = (newConfig: Record<string, any>) => {
    setFormData(prev => ({
      ...prev,
      ...newConfig,
    }));
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

  if (!modalState.isOpen) { return null; }

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
          <div className="mb-4">
            <Input
              type="text"
              name="name"
              label={
                <span className="label-text font-medium text-base-content">
                  Provider Name
                  <span className="text-error ml-1">*</span>
                </span>
              }
              placeholder="Enter a descriptive name for this provider"
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={errors.name}
              bordered
              className="w-full"
            />
          </div>

          {/* Provider-specific fields */}
          <div className="space-y-4 mb-6">
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
    </div>
  );
};

export default ProviderConfigModal;
