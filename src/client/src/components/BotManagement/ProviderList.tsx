import React from 'react';
import {
  MessageProvider,
  LLMProvider
} from '../../types/bot';
import ProviderChip from './ProviderChip';
import { Plus as PlusIcon } from 'lucide-react';

interface ProviderListProps {
  providers: MessageProvider[] | LLMProvider[];
  type: 'message' | 'llm';
  onRemove?: (providerId: string) => void;
  onEdit?: (provider: MessageProvider | LLMProvider) => void;
  disabled?: boolean;
}

const ProviderList: React.FC<ProviderListProps> = ({
  providers,
  type,
  onRemove,
  onEdit,
  disabled = false
}) => {
  if (providers.length === 0) {
    return (
      <div className={`
        bg-base-200/50 border border-dashed border-base-300
        rounded-lg p-4 text-center
        ${disabled ? 'opacity-50' : ''}
      `}>
        <div className="flex flex-col items-center justify-center py-2">
          <PlusIcon className="w-8 h-8 text-base-content/30 mb-2" />
          <p className="text-sm text-base-content/60 font-medium">
            No {type} providers configured
          </p>
          <p className="text-xs text-base-content/40 mt-1">
            Click the + button to add a {type} provider
          </p>
          {type === 'message' && (
            <p className="text-xs text-base-content/40 mt-1">
              Multiple message providers will be connected simultaneously
            </p>
          )}
          {type === 'llm' && (
            <p className="text-xs text-base-content/40 mt-1">
              First LLM provider will be primary, others as fallback
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {type === 'llm' && providers.length > 0 && (
        <div className="text-xs text-base-content/60 mb-2 italic">
          💡 First provider is primary, others serve as fallback
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {providers.map((provider, index) => (
          <ProviderChip
            key={provider.id}
            provider={provider}
            type={type}
            onRemove={() => onRemove?.(provider.id)}
            onEdit={() => onEdit?.(provider)}
            disabled={disabled}
            showPrimary={type === 'llm' && index === 0}
            isPrimary={type === 'llm' && index === 0}
          />
        ))}
      </div>

      {type === 'message' && providers.length > 0 && (
        <div className="text-xs text-base-content/60 mt-2 italic">
          📡 All message providers are connected simultaneously
        </div>
      )}
    </div>
  );
};

export default ProviderList;