import React from 'react';
import type {
  MessageProvider,
  LLMProvider
} from '../../types/bot';
import { Badge } from '../DaisyUI';
import { X as XIcon, Edit as EditIcon } from 'lucide-react';

interface ProviderChipProps {
  provider: MessageProvider | LLMProvider;
  type: 'message' | 'llm';
  onRemove?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
  showPrimary?: boolean;
  isPrimary?: boolean;
}

const ProviderChip: React.FC<ProviderChipProps> = ({
  provider,
  type,
  onRemove,
  onEdit,
  disabled = false,
  showPrimary = false,
  isPrimary = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'available':
        return 'badge-success';
      case 'disconnected':
      case 'unavailable':
        return 'badge-warning';
      case 'error':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'available':
        return 'Available';
      case 'unavailable':
        return 'Unavailable';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const getProviderIcon = (providerType: string) => {
    const icons: Record<string, string> = {
      // Message providers
      discord: '💬',
      telegram: '✈️',
      slack: '📱',
      webhook: '🔗',
      // LLM providers
      openai: '🤖',
      anthropic: '🧠',
      ollama: '🦙',
      huggingface: '🤗',
      custom: '⚙️'
    };
    return icons[providerType] || '❓';
  };

  const getProviderTypeLabel = (providerType: string) => {
    const labels: Record<string, string> = {
      // Message providers
      discord: 'Discord',
      telegram: 'Telegram',
      slack: 'Slack',
      webhook: 'Webhook',
      // LLM providers
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      ollama: 'Ollama',
      huggingface: 'Hugging Face',
      custom: 'Custom'
    };
    return labels[providerType] || providerType;
  };

  return (
    <div className="relative group">
      <div className={`
        chip bg-base-200 border border-base-300
        hover:bg-base-300 transition-colors duration-200
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}>
        <div className="chip-content flex items-center gap-2 px-3 py-2">
          {/* Provider Icon */}
          <span className="text-lg">{getProviderIcon(provider.type)}</span>

          {/* Provider Info */}
          <div className="flex flex-col items-start min-w-0">
            <span className="font-medium text-sm truncate max-w-[120px]">
              {provider.name}
            </span>
            <span className="text-xs text-base-content/60 truncate max-w-[120px]">
              {getProviderTypeLabel(provider.type)}
            </span>
          </div>

          {/* Status Badge */}
          <Badge color={getStatusColor(provider.status)} size="xs" className="ml-1">
            {getStatusText(provider.status)}
          </Badge>

          {/* Action Buttons */}
          <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Edit Button */}
            {onEdit && !disabled && (
              <button
                onClick={onEdit}
                className="btn btn-xs btn-circle btn-ghost"
                title="Edit provider"
              >
                <EditIcon className="w-3 h-3" />
              </button>
            )}

            {/* Remove Button */}
            {onRemove && !disabled && (
              <button
                onClick={onRemove}
                className="btn btn-xs btn-circle btn-ghost"
                title="Remove provider"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Indicator (for LLM providers) */}
      {showPrimary && isPrimary && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="badge badge-primary badge-xs">Primary</span>
        </div>
      )}

      {/* Disabled Overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-base-300/20 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

export default ProviderChip;
