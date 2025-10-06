import React, { useState, useEffect } from 'react';
import type { ProviderConfigModalProps } from '../provider-configs/types';
import { getProviderSchemasByType, getProviderSchema } from '../provider-configs';
import { ProviderConfigForm } from './ProviderConfigForm';
import { avatarService } from '../services/AvatarService';

interface ProviderOption {
  type: string;
  schema: any;
}

export const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  isOpen,
  providerType,
  initialProvider,
  initialConfig,
  onClose,
  onSave
}) => {
  const [selectedProviderType, setSelectedProviderType] = useState<string>('');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const availableProviders = getProviderSchemasByType(providerType);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(initialProvider ? 'configure' : 'select');

      if (initialProvider) {
        setSelectedProviderType(initialProvider.type);
        setConfig({ ...initialProvider.config, ...initialConfig });
      } else {
        setSelectedProviderType('');
        setConfig({});
      }

      setAvatarUrl(null);
      setIsLoading(false);
    }
  }, [isOpen, initialProvider, initialConfig]);

  const handleProviderSelect = (providerType: string) => {
    setSelectedProviderType(providerType);
    const schema = getProviderSchema(providerType);
    if (schema) {
      setConfig({ ...schema.defaultConfig });
    }
    setStep('configure');
  };

  const handleConfigChange = (newConfig: Record<string, any>) => {
    setConfig(newConfig);
  };

  const handleTestConnection = async (testConfig: Record<string, any>): Promise<boolean> => {
    // This would integrate with your backend testing service
    // For now, return a mock response
    console.log('Testing connection with config:', testConfig);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    return true;
  };

  const handleAvatarLoad = async (loadConfig: Record<string, any>): Promise<string | null> => {
    if (!avatarService.getSupportedProviders().includes(selectedProviderType)) {
      return null;
    }

    console.log('Loading avatar with config:', loadConfig);
    return await avatarService.loadAvatar(selectedProviderType, loadConfig);
  };

  const handleSave = () => {
    if (!selectedProviderType) return;

    const schema = getProviderSchema(selectedProviderType);
    if (!schema) return;

    onSave(selectedProviderType, {
      ...config,
      ...(avatarUrl && { avatarUrl })
    });

    onClose();
  };

  const handleBack = () => {
    setStep('select');
    setSelectedProviderType('');
    setConfig({});
    setAvatarUrl(null);
  };

  const handleClose = () => {
    setStep('select');
    setSelectedProviderType('');
    setConfig({});
    setAvatarUrl(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedSchema = getProviderSchema(selectedProviderType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {step === 'configure' && (
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-900">
                {step === 'select'
                  ? `Select ${providerType === 'message' ? 'Message' : 'LLM'} Provider`
                  : initialProvider
                    ? `Edit ${selectedSchema?.displayName || 'Provider'}`
                    : `Configure ${selectedSchema?.displayName || 'Provider'}`
                }
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {step === 'select' ? (
            // Provider Selection
            <div className="space-y-4">
              <p className="text-gray-600">
                Choose a {providerType === 'message' ? 'messaging' : 'LLM'} provider to connect with your bot.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableProviders.map((provider) => (
                  <button
                    key={provider.providerType}
                    onClick={() => handleProviderSelect(provider.providerType)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">
                        {provider.icon}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">
                          {provider.displayName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Configuration Form
            selectedSchema && (
              <ProviderConfigForm
                schema={selectedSchema}
                initialConfig={config}
                onConfigChange={handleConfigChange}
                onTestConnection={handleTestConnection}
                onAvatarLoad={handleAvatarLoad}
              />
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={handleSave}
                disabled={!selectedProviderType || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {initialProvider ? 'Save Changes' : 'Add Provider'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
