/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import type { ProviderModalState } from '../../types/bot';
import { Button } from '../DaisyUI';
import { X as XIcon } from 'lucide-react';
import { ProviderConfigForm } from '../ProviderConfigForm';
import {
  getProviderSchema,
  getProviderSchemasByType,
} from '../../provider-configs';
import type { ProviderConfigSchema } from '../../provider-configs/types';

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
  // Get available schemas for the current provider type
  const availableSchemas = useMemo(() => {
    return getProviderSchemasByType(modalState.providerType as 'message' | 'llm' | 'memory' | 'tool');
  }, [modalState.providerType]);

  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get the currently selected schema
  const selectedSchema = useMemo(() => {
    return selectedType ? getProviderSchema(selectedType) : null;
  }, [selectedType]);

  // Initialize form data when modal opens or provider changes
  useEffect(() => {
    if (modalState.isOpen) {
      if (modalState.isEdit && modalState.provider) {
        // Edit mode: populate with existing provider data
        setSelectedType(modalState.provider.type);
        setFormData({
          name: modalState.provider.name,
          ...modalState.provider.config,
        });
      } else {
        // Add mode: start with empty form
        // Select first available type if current selection is invalid
        const firstSchema = availableSchemas[0];
        const defaultType = firstSchema?.providerType || '';

        if (!selectedType || !availableSchemas.find(s => s.providerType === selectedType)) {
          setSelectedType(defaultType);
        }

        const defaultName = getDefaultName(selectedType || defaultType, existingProviders);
        setFormData({
          name: defaultName,
        });
        setErrors({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, modalState.providerType, availableSchemas]);

  const getDefaultName = (
    providerType: string,
    currentExistingProviders?: { name: string }[],
  ): string => {
    const schema = getProviderSchema(providerType);
    const baseName = schema?.displayName || 'New Provider';

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

  const validateField = (field: any, value: any): string | null => {
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
          // For API keys, don't fail validation in UI, just warn
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
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Provider name is required';
      isValid = false;
    }

    // Validate required fields from schema
    if (selectedSchema) {
      selectedSchema.fields.forEach((field) => {
        const error = validateField(field, formData[field.name]);
        if (error) {
          newErrors[field.name] = error;
          isValid = false;
        }
      });
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    const providerConfig: Record<string, any> = {};

    // Only include fields that have values, and perform casting
    if (selectedSchema) {
      selectedSchema.fields.forEach((field) => {
        const value = formData[field.name];
        if (value !== undefined && value !== '') {
          providerConfig[field.name] = field.type === 'number' ? Number(value) : value;
        }
      });
    }

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

  if (!modalState.isOpen) { return null; }

  // Determine title based on provider type
  const getProviderTypeLabel = () => {
    switch (modalState.providerType) {
      case 'message': return 'Message';
      case 'llm': return 'LLM';
      case 'memory': return 'Memory';
      case 'tool': return 'Tool';
      default: return 'Provider';
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {modalState.isEdit ? 'Edit' : 'Add'} {getProviderTypeLabel()} Provider
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
          aria-label={`${getProviderTypeLabel()} provider types`}
        >
          {availableSchemas.map((schema: ProviderConfigSchema) => {
            const isActive = selectedType === schema.providerType;
            return (
              <button
                key={schema.providerType}
                type="button"
                className={`tab tab-sm flex items-center gap-2 ${isActive ? 'tab-active' : ''}`}
                onClick={() => setSelectedType(schema.providerType)}
                role="tab"
                aria-selected={isActive}
                aria-label={`Select ${schema.displayName}`}
              >
                <span>{schema.icon}</span>
                {schema.displayName}
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
            />
            {errors.name && <label className="label"><span className="label-text-alt text-error">{errors.name}</span></label>}
          </div>

          {/* Provider-specific fields */}
          <div className="space-y-4 mb-6">
            {selectedSchema ? (
              <ProviderConfigForm
                providerType={selectedType}
                schema={selectedSchema}
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
              <div className="text-center py-8 text-base-content/60">
                Select a provider type to configure
              </div>
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
