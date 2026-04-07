/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import type {
  BotInstance,
} from '../../types';
import {
  BotStatus,
  MESSAGE_PROVIDER_CONFIGS,
  LLM_PROVIDER_CONFIGS,
} from '../../types';
import Badge from '../DaisyUI/Badge';
import {
  Play as PlayIcon,
  Square as StopIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
} from 'lucide-react';

interface BotCardProps {
  bot: BotInstance | any;
  personas?: any[];
  /** Simplified props used by BotsPage */
  isSelected?: boolean;
  onPreview?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  /** Legacy props from older usage */
  onStartBot?: (botId: string) => void;
  onStopBot?: (botId: string) => void;
  onConfigureBot?: (botId: string) => void;
  onCloneBot?: (botId: string) => void;
  onDeleteBot?: (botId: string) => void;
  onAddProvider?: (botId: string, providerType: 'message' | 'llm') => void;
  onRemoveProvider?: (botId: string, providerId: string) => void;
  onPersonaChange?: (botId: string, personaId: string) => void;
}

const BotCard: React.FC<BotCardProps> = ({
  bot,
  isSelected,
  onPreview,
  onEdit,
  onDelete,
  onToggleStatus,
  onStartBot,
  onStopBot,
  onConfigureBot,
  onDeleteBot,
}) => {
  const getStatusColor = (status: string): "success" | "ghost" | "error" | "info" => {
    switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
    case 'stopping':
      return 'ghost';
    case 'error':
      return 'error';
    case 'starting':
      return 'info';
    default:
      return 'ghost';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
    case 'active':
      return 'Running';
    case 'inactive':
      return 'Stopped';
    case 'error':
      return 'Error';
    case 'starting':
      return 'Starting';
    case 'stopping':
      return 'Stopping';
    default:
      return status;
    }
  };

  const canStart = bot.status === 'inactive' || bot.status === 'error';
  const canStop = bot.status === 'active';

  // Resolve provider display names
  const messageProviders = bot.messageProviders || [];
  const llmProviders = bot.llmProviders || [];

  const getProviderLabel = (type: string, configs: Record<string, any>): string => {
    const config = Object.values(configs).find((c: any) => c.type === type);
    return config ? (config as any).displayName : type;
  };

  // Persona info: use bot.persona object or fallback
  const persona = bot.persona;
  const personaName = persona?.name || '';
  const personaInitial = (bot.name || 'B').charAt(0).toUpperCase();

  // Category color for avatar background
  const getCategoryBg = (category?: string) => {
    const colors: Record<string, string> = {
      professional: 'bg-success/20 text-success',
      creative: 'bg-secondary/20 text-secondary',
      technical: 'bg-accent/20 text-accent',
      casual: 'bg-warning/20 text-warning',
      educational: 'bg-info/20 text-info',
      entertainment: 'bg-warning/20 text-warning',
      general: 'bg-neutral/20 text-neutral',
      customer_service: 'bg-primary/20 text-primary',
    };
    return colors[category || ''] || 'bg-primary/20 text-primary';
  };

  const handleStartStop = () => {
    if (onToggleStatus) {
      onToggleStatus();
    } else if (canStart && onStartBot) {
      onStartBot(bot.id);
    } else if (canStop && onStopBot) {
      onStopBot(bot.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else if (onConfigureBot) {
      onConfigureBot(bot.id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else if (onDeleteBot) {
      onDeleteBot(bot.id);
    }
  };

  return (
    <div
      className={`card bg-base-100 shadow-md border hover:shadow-lg transition-shadow duration-200 cursor-pointer ${
        isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-base-300'
      }`}
      onClick={onPreview}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPreview?.(); }}
    >
      <div className="card-body p-4">
        {/* Top row: Avatar + Name + Status */}
        <div className="flex items-start gap-3">
          {/* Persona Avatar */}
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold ${getCategoryBg(persona?.category)}`}
            title={personaName || bot.name}
          >
            {personaInitial}
          </div>

          {/* Name + Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base truncate" title={bot.name}>
                {bot.name}
              </h3>
              <Badge
                variant={getStatusColor(bot.status)}
                size="sm"
                className="whitespace-nowrap shrink-0"
              >
                {getStatusText(bot.status)}
              </Badge>
            </div>
            {bot.description && (
              <p className="text-sm text-base-content/60 line-clamp-1 mb-1.5">
                {bot.description}
              </p>
            )}

            {/* Provider badges */}
            <div className="flex flex-wrap gap-1.5">
              {messageProviders.map((p: any) => (
                <span
                  key={p.id || p.type}
                  className="badge badge-sm badge-outline gap-1"
                  title={`Message: ${getProviderLabel(p.type, MESSAGE_PROVIDER_CONFIGS)}`}
                >
                  {getProviderLabel(p.type, MESSAGE_PROVIDER_CONFIGS)}
                </span>
              ))}
              {llmProviders.map((p: any) => (
                <span
                  key={p.id || p.type}
                  className="badge badge-sm badge-outline badge-primary gap-1"
                  title={`LLM: ${getProviderLabel(p.type, LLM_PROVIDER_CONFIGS)}`}
                >
                  {getProviderLabel(p.type, LLM_PROVIDER_CONFIGS)}
                </span>
              ))}
              {messageProviders.length === 0 && llmProviders.length === 0 && (
                <span className="badge badge-sm badge-warning badge-outline">No providers</span>
              )}
            </div>
          </div>

          {/* Compact actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              className={`btn btn-xs btn-ghost btn-square ${canStart ? 'text-success' : canStop ? 'text-error' : 'btn-disabled'}`}
              onClick={handleStartStop}
              disabled={!canStart && !canStop}
              aria-label={canStart ? 'Start bot' : 'Stop bot'}
              title={canStart ? 'Start' : 'Stop'}
            >
              {canStart ? <PlayIcon className="w-3.5 h-3.5" /> : <StopIcon className="w-3.5 h-3.5" />}
            </button>
            <button
              className="btn btn-xs btn-ghost btn-square"
              onClick={handleEdit}
              aria-label="Edit bot"
              title="Edit"
            >
              <EditIcon className="w-3.5 h-3.5" />
            </button>
            <button
              className="btn btn-xs btn-ghost btn-square text-error/70 hover:text-error"
              onClick={handleDelete}
              aria-label="Delete bot"
              title="Delete"
            >
              <DeleteIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error alert (only when there is an error) */}
        {bot.error && (
          <div className="alert alert-error py-1.5 mt-2">
            <span className="text-xs">{bot.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BotCard;
