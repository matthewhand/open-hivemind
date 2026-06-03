import React, { useState, useEffect, useMemo } from 'react';
import type {
  ProviderModalState,
  ProviderTypeConfig,
  FieldConfig,
} from '../../types/bot';
import type {
  MessageProviderType,
  LLMProviderType,
} from '../../types/bot';
import {
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS,
} from '../../types/bot';
import Button from '../DaisyUI/Button';
import Modal from '../DaisyUI/Modal';
import Tabs from '../DaisyUI/Tabs';
import type { TabItem } from '../DaisyUI/Tabs';
import { Alert } from '../DaisyUI/Alert';
import { X as XIcon, RotateCcw } from 'lucide-react';
import { logger } from '../../utils/logger';
import { ProviderConfigForm } from '../ProviderConfigForm';
import type { ProviderConfigSchema } from '../../provider-configs';
import { getProviderSchema } from '../../provider-configs';
import { apiService } from '../../services/api';
import type { ProviderSchema } from '../../hooks/useAvailableProviderTypes';
import { useAvailableProviderTypes } from '../../hooks/useAvailableProviderTypes';
import { DynamicSchemaForm } from '../DynamicSchemaForm';
import { useConfigDiff } from '../../hooks/useConfigDiff';
import { ConfigDiffConfirmDialog } from '../ConfigDiffViewer';
import Select from '../DaisyUI/Select';

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
    modalState.providerType === 'message' ? 'discord' : 'openai',
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openAiEmbeddingModels, setOpenAiEmbeddingModels] = useState<string[]>([]);
  const [showDiffConfirm, setShowDiffConfirm] = useState(false);

  // Fetch self-documenting schemas from provider packages
  const { data: apiProviderTypes } = useAvailableProviderTypes();

  // Build a lookup of API schemas by key for the current provider category
  const apiSchemasByKey = useMemo<Record<string, ProviderSchema>>(() => {
    const list = modalState.providerType === 'message'
      ? apiProviderTypes.messenger
      : modalState.providerType === 'llm'
        ? apiProviderTypes.llm
        : apiProviderTypes.memory;
    return Object.fromEntries((list ?? []).map((s) => [s.key, s]));
  }, [apiProviderTypes, modalState.providerType]);

  // Merged LLM provider type list: hardcoded list + any extra API keys not already present
  const mergedLlmProviderTypes = useMemo<string[]>(() => {
    const hardcoded = Object.keys(LLM_PROVIDER_CONFIGS);
    if (!apiProviderTypes.llm || apiProviderTypes.llm.length === 0) return hardcoded;
    const apiKeys = apiProviderTypes.llm.map((s) => s.key);
    const extra = apiKeys.filter((k) => !hardcoded.includes(k));
    return [...hardcoded, ...extra];
  }, [apiProviderTypes.llm]);

  // Merged message provider type list: hardcoded list + any extra API keys not already present
  const mergedMessageProviderTypes = useMemo<string[]>(() => {
    const hardcoded = Object.keys(MESSAGE_PROVIDER_CONFIGS);
    if (!apiProviderTypes.messenger || apiProviderTypes.messenger.length === 0) return hardcoded;
    const apiKeys = apiProviderTypes.messenger.map((s) => s.key);
    const extra = apiKeys.filter((k) => !hardcoded.includes(k));
    return [...hardcoded, ...extra];
  }, [apiProviderTypes.messenger]);

  const formDataAsRecord = useMemo(() => formData as Record<string, unknown>, [formData]);
  const { hasChanges, diff, setOriginalConfig, resetToOriginal } = useConfigDiff(formDataAsRecord);

  const handleUndoAll = () => {
    const original = resetToOriginal();
    setFormData(original as Record<string, any>);
  };

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
          ? 'discord'
          : 'openai';

        const isCurrentTypeValid = modalState.providerType === 'message'
          ? Object.keys(MESSAGE_PROVIDER_CONFIGS).includes(selectedType as string)
          : Object.keys(LLM_PROVIDER_CONFIGS).includes(selectedType as string);

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
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, modalState.providerType]);

  // Snapshot the original config after modal initializes
  useEffect(() => {
    if (modalState.isOpen && Object.keys(formData).length > 0) {
      setOriginalConfig(formData as Record<string, unknown>);
    }
  }, [modalState.isOpen]);

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
      } catch (_error) {
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
      selectedType !== 'openai' ||
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
    // Also check API schema label as fallback for provider types not in the hardcoded list
    const apiLabel = apiSchemasByKey[type]?.label;
    const baseName = config?.displayName || config?.name || apiLabel || 'New Provider';

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
      selectedType !== 'openai' ||
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

  // Build a normalized field list from API schema for validation/submission
  // when no local ProviderConfigSchema is available for the selected type
  const getApiSchemaFields = (): Array<{ name: string; label: string; required: boolean; type: string }> => {
    const s = apiSchemasByKey[selectedType];
    if (!s) return [];
    return [
      ...s.fields.required.map((f: any) => ({ ...f, required: true })),
      ...s.fields.optional.map((f: any) => ({ ...f, required: false })),
      ...s.fields.advanced.map((f: any) => ({ ...f, required: false })),
    ];
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
    const allFields = schema
      ? schema.fields
      : config?.fields
        ? config.fields
        : getApiSchemaFields();

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
    const allFields = schema
      ? schema.fields
      : config?.fields
        ? config.fields
        : getApiSchemaFields();

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
  // Use merged provider type lists (hardcoded + API-discovered)
  const providerTypes = modalState.providerType === 'message'
    ? mergedMessageProviderTypes
    : mergedLlmProviderTypes;
  // Safe config access: if selectedType mismatch, fallback to first in list
  const config = (configs as any)[selectedType] || (configs as any)[providerTypes[0]];
  const currentSchema = getCurrentSchema();
  const _allFields = config?.fields || [];

  // Helper: get display name for a provider type key (from hardcoded config or API schema)
  const getProviderDisplayName = (type: string): string => {
    const hardcoded = (configs as any)[type];
    if (hardcoded && (hardcoded.displayName || hardcoded.name)) {
      return hardcoded.displayName || hardcoded.name;
    }
    return apiSchemasByKey[type]?.label ?? type;
  };

  // Helper: get icon for a provider type key
  const getProviderIcon = (type: string): string => {
    const hardcoded = (configs as any)[type];
    if (hardcoded && hardcoded.icon && typeof hardcoded.icon === 'string') {
      return hardcoded.icon;
    }
    return '\u2022';
  };

  const messageProviderTabs: TabItem[] = providerTypes.map(type => ({
    key: type,
    label: getProviderDisplayName(type),
    icon: <span>{getProviderIcon(type)}</span>,
  }));

  // API schema for the currently selected provider type (used as fallback form renderer)
  const apiSchemaForSelected: ProviderSchema | undefined = apiSchemasByKey[selectedType];

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={onClose}
      title={`${modalState.isEdit ? 'Edit' : 'Add'} ${modalState.providerType === 'message' ? 'Message' : 'LLM'} Provider`}
      size="lg"
      showCloseButton
      actions={[
        { label: 'Cancel', onClick: onClose, variant: 'ghost' },
        {
          label: `${modalState.isEdit ? 'Update' : 'Submit'} Provider`,
          onClick: () => {
            if (hasChanges && modalState.isEdit) {
              setShowDiffConfirm(true);
            } else {
              const syntheticEvent = { preventDefault: () => { } } as React.FormEvent;
              handleSubmit(syntheticEvent);
            }
          },
          variant: 'primary',
        },
      ]}
    >

      {modalState.providerType === 'llm' ? (
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text font-medium">Provider Type</span>
            <span className="label-text-alt text-error">*</span>
          </label>
          <Select
            className="select-bordered"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as LLMProviderType)}
          >
            {providerTypes.map(type => {
              return (
                <option key={type} value={type}>
                  {getProviderDisplayName(type)}
                </option>
              );
            })}
          </Select>
        </div>
      ) : (
        <div className="form-control mb-6">
          <label className="label pb-0">
            <span className="label-text font-medium">Provider Type</span>
            <span className="label-text-alt text-error">*</span>
          </label>
          <Tabs
            tabs={messageProviderTabs}
            activeTab={selectedType}
            onChange={(key) => setSelectedType(key as MessageProviderType | LLMProviderType)}
            variant="boxed"
            size="sm"
            className="flex-wrap gap-1"
            aria-label="Select a message provider type"
          />
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
          selectedType === 'openai' &&
          (formData.modelType || 'chat') === 'embedding' &&
          openAiEmbeddingModels.length > 0 && (
            <Alert status="info" className="mb-4 text-sm" message="Select an embedding-capable OpenAI provider first, then choose one of the configured embedding models." />
          )}

        {/* Provider-specific fields */}
        <div className="space-y-4 mb-6">
          {currentSchema ? (
            /* Preferred: rich local schema via ProviderConfigForm */
            <ProviderConfigForm
              providerType={selectedType}
              schema={currentSchema}
              initialConfig={formData}
              onConfigChange={handleProviderConfigChange}
              externalErrors={errors}
              onTestConnection={async (config) => {
                // Enhanced test connection with provider-specific validation
                try {
                  await apiService.post('/api/admin/providers/test-connection', {
                    providerType: selectedType,
                    config,
                  });
                  return true;
                } catch (err) {
                  logger.error('Test connection failed:', err);
                  // Fallback: basic validation if endpoint not available
                  const hasRequiredFields = ['apiKey', 'endpoint', 'baseUrl', 'botToken'].some(
                    key => config[key] && config[key].toString().trim() !== ''
                  );
                  return hasRequiredFields;
                }
              }}
            />
          ) : apiSchemaForSelected ? (
            /* Fallback: dynamic form driven by self-documenting API schema */
            <DynamicSchemaForm
              schema={apiSchemaForSelected}
              values={formData as Record<string, string>}
              onChange={(name: string, value: any) => handleFieldChange(name, value)}
            />
          ) : null}
        </div>

        {/* Undo button (left-aligned above actions) */}
        {hasChanges && (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleUndoAll}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" /> Undo all changes
            </Button>
          </div>
        )}
      </form>

      <ConfigDiffConfirmDialog
        isOpen={showDiffConfirm}
        diff={diff}
        onConfirm={() => {
          setShowDiffConfirm(false);
          const syntheticEvent = { preventDefault: () => { } } as React.FormEvent;
          handleSubmit(syntheticEvent);
        }}
        onCancel={() => setShowDiffConfirm(false)}
        title="Confirm Provider Changes"
      />
    </Modal>
  );
};

export default ProviderConfigModal;
