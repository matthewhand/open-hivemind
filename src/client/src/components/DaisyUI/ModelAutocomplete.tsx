import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge, LoadingSpinner, Alert } from './index';

interface ModelOption {
  id: string;
  name: string;
  description?: string;
  provider?: string;
  contextLength?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

interface ModelAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onModelSelect?: (model: ModelOption) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  providerType: 'openai' | 'anthropic' | 'ollama' | 'custom';
  onValidationError?: (error: string) => void;
  onValidationSuccess?: () => void;
  className?: string;
}

const ModelAutocomplete: React.FC<ModelAutocompleteProps> = ({
  value,
  onChange,
  onModelSelect,
  placeholder = 'Enter model name...',
  label,
  disabled = false,
  apiKey,
  baseUrl,
  providerType,
  onValidationError,
  onValidationSuccess,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<ModelOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available models from provider API
  const fetchModels = useCallback(async () => {
    if (!apiKey || providerType === 'custom') return;

    setIsLoading(true);
    setFetchError(null);

    try {
      let endpoint = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Configure endpoint and headers based on provider
      switch (providerType) {
        case 'openai':
          endpoint = `${baseUrl || 'https://api.openai.com/v1'}/models`;
          headers['Authorization'] = `Bearer ${apiKey}`;
          break;
        case 'anthropic':
          // Anthropic doesn't have a public models endpoint, use static list
          setSuggestions([
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model for complex tasks' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced model for most use cases' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and compact model' },
            { id: 'claude-2.1', name: 'Claude 2.1', description: 'Legacy model with large context' },
            { id: 'claude-instant-1.2', name: 'Claude Instant', description: 'Fast and cost-effective' },
          ]);
          setIsLoading(false);
          return;
        case 'ollama':
          endpoint = `${baseUrl || 'http://localhost:11434'}/api/tags`;
          break;
        default:
          setIsLoading(false);
          return;
      }

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform response data based on provider
      let models: ModelOption[] = [];

      switch (providerType) {
        case 'openai':
          models = data.data?.map((model: any) => ({
            id: model.id,
            name: model.id,
            description: `Owned by ${model.owned_by}`,
            provider: 'openai'
          })) || [];
          break;
        case 'ollama':
          models = data.models?.map((model: any) => ({
            id: model.name,
            name: model.name,
            description: `${model.details?.parameter_size || 'Unknown'} • ${model.details?.family || 'Unknown'}`,
            provider: 'ollama'
          })) || [];
          break;
      }

      setSuggestions(models);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch models');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, baseUrl, providerType]);

  // Fetch models when API key or base URL changes
  useEffect(() => {
    if (apiKey && providerType !== 'custom') {
      fetchModels();
    }
  }, [apiKey, baseUrl, providerType, fetchModels]);

  // Validate model input
  const validateModel = useCallback(async (modelValue: string) => {
    if (!modelValue || providerType === 'custom') {
      setValidationWarning(null);
      onValidationSuccess?.();
      return;
    }

    setIsValidating(true);
    setValidationWarning(null);

    // Check if model exists in suggestions
    const exactMatch = suggestions.find(s => s.id === modelValue || s.name === modelValue);

    if (!exactMatch && suggestions.length > 0) {
      setValidationWarning(`Model "${modelValue}" not found in available models. Custom models may work with third-party providers.`);
      onValidationError?.(validationWarning || 'Model not in official list');
    } else {
      onValidationSuccess?.();
    }

    // Additional validation for API key format (warning only)
    if (apiKey && providerType === 'openai' && !apiKey.startsWith('sk-')) {
      setValidationWarning(prev => prev ?
        `${prev} • OpenAI API keys typically start with "sk-"` :
        'OpenAI API keys typically start with "sk-"'
      );
    } else if (apiKey && providerType === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      setValidationWarning(prev => prev ?
        `${prev} • Anthropic API keys typically start with "sk-ant-"` :
        'Anthropic API keys typically start with "sk-ant-"'
      );
    }

    setIsValidating(false);
  }, [suggestions, providerType, apiKey, onValidationError, onValidationSuccess, validationWarning]);

  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validateModel(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [value, validateModel]);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.name.toLowerCase().includes(value.toLowerCase()) ||
    suggestion.id.toLowerCase().includes(value.toLowerCase())
  );

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: ModelOption) => {
    onChange(suggestion.id);
    setIsOpen(false);
    setSelectedIndex(-1);
    onModelSelect?.(suggestion);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`form-control w-full ${className}`} ref={dropdownRef}>
      {label && (
        <label className="label">
          <span className="label-text font-medium">{label}</span>
          {isLoading && (
            <span className="label-text-alt">
              <LoadingSpinner size="xs" />
            </span>
          )}
        </label>
      )}

      <div className="dropdown dropdown-open w-full">
        <div className="input-group">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={`input input-bordered w-full ${
              validationWarning ? 'input-warning' : ''
            } ${isValidating ? 'loading' : ''}`}
          />

          {/* Loading indicator */}
          {isValidating && (
            <div className="btn btn-ghost btn-square">
              <LoadingSpinner size="sm" />
            </div>
          )}

          {/* Refresh models button */}
          {apiKey && providerType !== 'custom' && (
            <button
              type="button"
              onClick={fetchModels}
              disabled={isLoading}
              className="btn btn-ghost btn-square"
              title="Refresh model list"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {isOpen && (
          <div className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full max-h-80 overflow-y-auto z-50">
            {fetchError ? (
              <div className="p-2">
                <Alert
                  status="warning"
                  message={fetchError}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  }
                />
              </div>
            ) : filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`menu-item flex items-center justify-between p-2 rounded cursor-pointer hover:bg-base-200 ${
                    index === selectedIndex ? 'bg-base-200' : ''
                  } ${suggestion.id === value ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{suggestion.name}</span>
                      {suggestion.provider && (
                        <Badge variant="ghost" size="xs">{suggestion.provider}</Badge>
                      )}
                    </div>
                    {suggestion.description && (
                      <div className="text-xs text-base-content/60 truncate">
                        {suggestion.description}
                      </div>
                    )}
                  </div>
                  {suggestion.contextLength && (
                    <div className="text-xs text-base-content/50 ml-2">
                      {suggestion.contextLength.toLocaleString()}
                    </div>
                  )}
                </div>
              ))
            ) : value && !isLoading ? (
              <div className="p-2 text-center text-base-content/60">
                No models found matching "{value}"
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Validation warning */}
      {validationWarning && (
        <label className="label">
          <span className="label-text-alt text-warning flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {validationWarning}
          </span>
        </label>
      )}

      {/* Help text */}
      <label className="label">
        <span className="label-text-alt text-base-content/50">
          {providerType === 'custom'
            ? 'Enter custom model name for third-party provider'
            : suggestions.length > 0
              ? `Found ${suggestions.length} available models`
              : apiKey
                ? 'Enter API key to load available models'
                : 'Enter API key above to load available models'
          }
        </span>
      </label>
    </div>
  );
};

export default ModelAutocomplete;