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
  MESSAGE_PROVIDER_TYPES,
  LLM_PROVIDER_TYPES,
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS,
} from '../../types/bot';
import Button from '../DaisyUI/Button';
import { X as XIcon } from 'lucide-react';
import { ProviderConfigForm } from '../ProviderConfigForm';
import type { ProviderConfigSchema } from '../../provider-configs';
import { getProviderSchema } from '../../provider-configs';
import { apiService } from '../../services/api';

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
  const resolveModelType = (provider?: { modelType?: 'chat' | 'embedding' | 'both'; config?: Record<string, any> }) => {
    const rawValue = provider?.modelType || provider?.config?.modelType;
    return rawValue === 'embedding' || rawValue === 'both' ? rawValue : 'chat';
  };

  const [selectedType, setSelectedType] = useState<MessageProviderType | LLMProviderType>(
    modalState.providerType === 'message' ? MESSAGE_PROVIDER_TYPES.DISCORD : LLM_PROVIDER_TYPES.OPENAI,
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openAiEmbeddingModels, setOpenAiEmbeddingModels] = useState<string[]>([]);

  // Initialize form data when modal opens or provider changes
  useEffect(() => {
    if (modalState.isOpen) {
      if (modalState.isEdit && modalState.provider) {
        // Edit mode: populate with existing provider data
        setSelectedType(modalState.provider.type as MessageProviderType | LLMProviderType);
        setFormData({
          name: modalState.provider.name,
          modelType: modalState.providerType === 'llm' ? resolveModelType(modalState.provider as any) : undefined,
          ...modalState.provider.config,
        });
      } else {
        // Add mode: start with empty form
        const defaultType = modalState.providerType === 'message'
          ? MESSAGE_PROVIDER_TYPES.DISCORD
          : LLM_PROVIDER_TYPES.OPENAI;

        const isCurrentTypeValid = modalState.providerType === 'message'
          ? Object.values(MESSAGE_PROVIDER_TYPES).includes(selectedType as MessageProviderType)
          : Object.values(LLM_PROVIDER_TYPES).includes(selectedType as LLMProviderType);

        let newType = selectedType;
        if (!isCurrentTypeValid) {
          newType = defaultType;
          setSelectedType(newType);
        }

        const defaultName = getDefaultName(newType, modalState.providerType as 'message' | 'llm', existingProviders);
        setFormData({
          name: defaultName,
          ...(modalState.providerType === 'llm' ? { modelType: 'chat' } : {}),
        });
        setErrors({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, modalState.providerType]);

  useEffect(() => {
    if (!modalState.isOpen || modalState.providerType !== 'llm') {
      return;
    }

    let isActive = true;

    const fetchConfig = async () => {
      try {
        const config: any = await apiService.get('/api/config/global');
        if (!isActive) return;

        const models = config?.openai?.values?.OPENAI_EMBEDDING_MODELS;
        setOpenAiEmbeddingModels(Array.isArray(models) ? models.filter((value): value is string => typeof value === 'string' && value.trim() !== '') : []);
      } catch (error) {
        if (isActive) {
          setOpenAiEmbeddingModels([]);
        }
      }
    };

    fetchConfig();

    return () => {
      isActive = false;
    };
  }, [modalState.isOpen, modalState.providerType]);

  useEffect(() => {
    if (
      modalState.providerType !== 'llm' ||
      selectedType !== LLM_PROVIDER_TYPES.OPENAI ||
      (formData.modelType || 'chat') !== 'embedding' ||
      openAiEmbeddingModels.length === 0
    ) {
      return;
    }

    if (!openAiEmbeddingModels.includes(formData.model)) {
      setFormData(prev => ({
        ...prev,
        model: openAiEmbeddingModels[0],
      }));
    }
  }, [formData.model, formData.modelType, modalState.providerType, openAiEmbeddingModels, selectedType]);

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

  const getCurrentSchema = (): ProviderConfigSchema | undefined => {
    const schema = getProviderSchema(selectedType);
    if (!schema) {
      return undefined;
    }

    if (
      modalState.providerType !== 'llm' ||
      selectedType !== LLM_PROVIDER_TYPES.OPENAI ||
      (formData.modelType || 'chat') !== 'embedding' ||
      openAiEmbeddingModels.length === 0
    ) {
      return schema;
    }

    return {
      ...schema,
      fields: schema.fields.map((field) => {
        if (field.name !== 'model') {
          return field;
        }

        return {
          ...field,
          type: 'select',
          description: 'Choose an embedding model from the configured OpenAI embedding model catalog.',
          options: openAiEmbeddingModels.map((model) => ({
            label: model,
            value: model,
          })),
          component: undefined,
          componentProps: undefined,
          defaultValue: openAiEmbeddingModels[0],
        };
      }),
    };
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
    if (modalState.providerType === 'llm' && !['chat', 'embedding', 'both'].includes(formData.modelType || 'chat')) {
      newErrors.modelType = 'Model type must be chat, embedding, or both';
      isValid = false;
    }

    const schema = getCurrentSchema();
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
    const schema = getCurrentSchema();
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
      ...(modalState.providerType === 'llm' ? { modelType: formData.modelType || 'chat' } : {}),
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

  // Get ALL configs to iterate types for tabs
  const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
  const providerTypes = Object.keys(configs);
  // Safe config access: if selectedType mismatch, fallback to first in list
  const config = (configs as any)[selectedType] || (configs as any)[providerTypes[0]];
  const currentSchema = getCurrentSchema();
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
            aria-label="Close modal"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {modalState.providerType === 'llm' ? (
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-medium">Provider</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as LLMProviderType)}
            >
              {providerTypes.map(type => {
                const typeConfig = (configs as any)[type];
                return (
                  <option key={type} value={type}>
                    {typeConfig.displayName || typeConfig.name}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div
            className="tabs tabs-boxed mb-6 flex-wrap gap-1"
            role="tablist"
            aria-label="Message provider types"
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
                  <span>{typeof typeConfig.icon === 'string' ? typeConfig.icon : '•'}</span>
                  {typeConfig.displayName || typeConfig.name}
                </button>
              );
            })}
          </div>
        )}

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

          {modalState.providerType === 'llm' && (
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-medium">Model Type</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <select
                name="modelType"
                className={`select select-bordered w-full ${errors.modelType ? 'select-error' : ''}`}
                value={formData.modelType || 'chat'}
                onChange={(e) => handleFieldChange('modelType', e.target.value)}
              >
                <option value="chat">Chat</option>
                <option value="embedding">Embedding</option>
                <option value="both">Both</option>
              </select>
              <label className="label">
                <span className="label-text-alt">
                  Mark embedding-only profiles so they can be used by memory/search without appearing as chat models.
                </span>
              </label>
              {errors.modelType && <label className="label"><span className="label-text-alt text-error">{errors.modelType}</span></label>}
            </div>
          )}

          {modalState.providerType === 'llm' &&
            selectedType === LLM_PROVIDER_TYPES.OPENAI &&
            (formData.modelType || 'chat') === 'embedding' &&
            openAiEmbeddingModels.length > 0 && (
            <div className="alert alert-info mb-4 text-sm">
              <span>
                Select an embedding-capable OpenAI provider first, then choose one of the configured embedding models.
              </span>
            </div>
          )}

          {/* Provider-specific fields */}
          <div className="space-y-4 mb-6">
            {currentSchema && (
              <ProviderConfigForm
                providerType={selectedType}
                schema={currentSchema}
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
