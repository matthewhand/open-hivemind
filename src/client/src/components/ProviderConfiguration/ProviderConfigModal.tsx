/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Button, Input, Select, Modal } from '../DaisyUI';
import { X as XIcon, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { ProviderConfigForm } from '../ProviderConfigForm';
import { getProviderSchema } from '../../provider-configs';

interface ProviderConfigModalProps {
  modalState: ProviderModalState;
  existingProviders?: { name: string; type: string; config?: Record<string, any> }[];
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
  const [providerName, setProviderName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [cloneFromId, setCloneFromId] = useState<string>('');
  const [showCloneSuccess, setShowCloneSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Initialize form data when modal opens or provider changes
  useEffect(() => {
    if (modalState.isOpen) {
      if (modalState.isEdit && modalState.provider) {
        // Edit mode: populate with existing provider data
        setSelectedType(modalState.provider.type as MessageProviderType | LLMProviderType);
        setProviderName(modalState.provider.name);
        setProviderConfig(modalState.provider.config);
      } else {
        // Add mode: start with empty form
        const defaultType = modalState.providerType === 'message'
          ? MessageProviderType.DISCORD
          : LLMProviderType.OPENAI;

        let newType = selectedType;
        const isCurrentTypeValid = modalState.providerType === 'message'
          ? Object.values(MessageProviderType).includes(selectedType as MessageProviderType)
          : Object.values(LLMProviderType).includes(selectedType as LLMProviderType);

        if (!isCurrentTypeValid) {
          newType = defaultType;
          setSelectedType(newType);
        }

        const defaultName = getDefaultName(newType, modalState.providerType as 'message' | 'llm', existingProviders);
        setProviderName(defaultName);
        setProviderConfig({});
        setNameError(null);
        setFormError(null);
      }
    }
  }, [modalState.isOpen, modalState.provider, modalState.isEdit, selectedType, modalState.providerType, existingProviders]);

  // Keyboard navigation for tabs
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!tabsRef.current) return;

    const tabs = Array.from(tabsRef.current.querySelectorAll('[role="tab"]')) as HTMLElement[];
    const currentIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      tabs[newIndex]?.click();
      tabs[newIndex]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      tabs[newIndex]?.click();
      tabs[newIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      tabs[0]?.click();
      tabs[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      tabs[tabs.length - 1]?.click();
      tabs[tabs.length - 1]?.focus();
    }
  }, []);

  // Focus trap within modal
  useEffect(() => {
    if (modalState.isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        } else if (e.key === 'Escape') {
          onClose();
        }
      };

      modalRef.current.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      return () => {
        modalRef.current?.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [modalState.isOpen, onClose]);

  // Get providers of same type for cloning (only in add mode)
  const sameTypeProviders = existingProviders?.filter(
    p => p.type === selectedType && (!modalState.isEdit || p.name !== modalState.provider?.name)
  ) || [];

  const handleCloneFrom = (providerId: string) => {
    const providerToClone = existingProviders?.find(p => p.name === providerId || (p as any).id === providerId);
    if (providerToClone && providerToClone.config) {
      setProviderConfig({ ...providerToClone.config });
      setShowCloneSuccess(true);
      setTimeout(() => setShowCloneSuccess(false), 3000);
    }
    setCloneFromId(providerId);
  };

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

  const validateForm = (): boolean => {
    let isValid = true;
    const missingFields: string[] = [];

    // Validate name
    if (!providerName || providerName.trim() === '') {
      setNameError('Provider name is required');
      isValid = false;
    } else {
      setNameError(null);
    }

    const schema = getProviderSchema(selectedType);
    if (!schema) {
      setFormError(`Configuration schema not found for provider type "${selectedType}". Please contact support.`);
      return false;
    }

    // Further validation is implicitly handled by ProviderConfigForm internally,
    // but we can check required fields here too before submission.
    for (const field of schema.fields) {
      if (field.required && (providerConfig[field.name] === undefined || providerConfig[field.name] === '')) {
        isValid = false;
        missingFields.push(field.label);
      }
    }

    if (!isValid && missingFields.length > 0) {
      setFormError(`Please fill in all required fields: ${missingFields.join(', ')}`);
    } else {
      setFormError(null);
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      // Return early if not valid. We should show error for name at least.
      // And we might rely on ProviderConfigForm to show errors for missing fields when "Test Connection" is clicked, but here we can't easily trigger it.
      // We will let the user know if they missed something.
      if (!providerName || providerName.trim() === '') {
        setNameError('Provider name is required');
      }
      return;
    }

    const providerData = {
      name: providerName,
      type: selectedType,
      config: providerConfig,
      ...(modalState.isEdit && { id: modalState.provider?.id }),
    };

    onSubmit(providerData);
  };

  if (!modalState.isOpen) { return null; }

  // Get ALL configs to iterate types for tabs
  const configs = modalState.providerType === 'message' ? MESSAGE_PROVIDER_CONFIGS : LLM_PROVIDER_CONFIGS;
  const providerTypes = Object.keys(configs);

  const richSchema = getProviderSchema(selectedType);

  return (
    <Modal
      isOpen={modalState.isOpen}
      onClose={onClose}
      className="max-w-2xl"
      size="lg"
      title={`${modalState.isEdit ? 'Edit' : 'Add'} ${modalState.providerType === 'message' ? 'Message' : 'LLM'} Provider`}
    >
      <div ref={modalRef}>

        {/* Provider Type Tabs - flex-wrap and gap-1 fix overlapping tabs in modal */}
        <div
          ref={tabsRef}
          className="tabs tabs-boxed mb-6 flex-wrap gap-1"
          role="tablist"
          aria-label={`${modalState.providerType === 'message' ? 'Message' : 'LLM'} provider types`}
          onKeyDown={handleKeyDown}
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
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="alert alert-error text-sm py-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{formError}</span>
            </div>
          )}
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
              value={providerName}
              onChange={(e) => {
                setProviderName(e.target.value);
                if (e.target.value.trim() !== '') {
                  setNameError(null);
                }
                setFormError(null);
              }}
              error={nameError || undefined}
              bordered
              className="w-full"
            />
          </div>

          {/* Clone from existing provider (only in add mode) */}
          {!modalState.isEdit && sameTypeProviders.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Copy className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-base-content">Clone configuration from existing provider</span>
              </div>
              <Select
                value={cloneFromId}
                onChange={(e) => handleCloneFrom(e.target.value)}
                className="w-full"
                options={[
                  { label: 'Start fresh (no cloning)', value: '' },
                  ...sameTypeProviders.map(p => ({ label: p.name, value: p.name }))
                ]}
              />
              {showCloneSuccess && (
                <div className="mt-2 text-sm text-success flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Configuration copied successfully!
                </div>
              )}
            </div>
          )}

          {/* Provider-specific fields */}
          {richSchema ? (
            <ProviderConfigForm
              schema={richSchema}
              initialConfig={providerConfig}
              onConfigChange={(newConfig) => {
                setProviderConfig(newConfig);
                setFormError(null);
              }}
            />
          ) : (
            <div className="alert alert-error">Schema not found for provider type.</div>
          )}

          {/* Actions */}
          <div className="modal-action mt-6">
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
              {modalState.isEdit ? 'Update' : 'Submit'} Provider
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ProviderConfigModal;
