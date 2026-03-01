/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import type {
  BotInstance,
  MessageProvider,
  LLMProvider,
  Persona,
  ProviderModalState,
} from '../../types/bot';
import {
  BotStatus,
  DEFAULT_PERSONA,
} from '../../types/bot';
import { Button, Badge } from '../DaisyUI';
import {
  Play as PlayIcon,
  Square as StopIcon,
  Settings as SettingsIcon,
  Copy as CloneIcon,
  Trash2 as DeleteIcon,
  MoreVertical as MoreIcon,
  User as UserIcon,
  Edit as EditIcon,
  Plus as PlusIcon,
} from 'lucide-react';
import ProviderList from './ProviderList';
import PersonaChip from './PersonaChip';
import PersonaSelector from './PersonaSelector';
import ProviderConfigModal from '../ProviderConfiguration/ProviderConfigModal';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';

interface BotCardProps {
  bot: BotInstance;
  personas: Persona[];
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
  personas,
  onStartBot,
  onStopBot,
  onConfigureBot,
  onCloneBot,
  onDeleteBot,
  onAddProvider,
  onRemoveProvider,
  onPersonaChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const dropdownContentRef = React.useRef<HTMLUListElement>(null);

  const { autoPosition, autoAlign } = useDropdownPosition({
    isOpen: isDropdownOpen,
    dropdownRef,
    contentRef: dropdownContentRef,
    defaultPosition: 'bottom',
  });

  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [providerModalState, setProviderModalState] = useState<ProviderModalState>({
    isOpen: false,
    providerType: 'message',
    mode: 'create',
  });

  const currentPersona = personas.find(p => p.id === bot.personaId) || DEFAULT_PERSONA;

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
    case BotStatus.ACTIVE:
      return 'badge-success';
    case BotStatus.INACTIVE:
    case BotStatus.STOPPING:
      return 'badge-ghost';
    case BotStatus.ERROR:
      return 'badge-error';
    case BotStatus.STARTING:
      return 'badge-info';
    default:
      return 'badge-ghost';
    }
  };

  const getStatusText = (status: BotStatus) => {
    switch (status) {
    case BotStatus.ACTIVE:
      return 'Running';
    case BotStatus.INACTIVE:
      return 'Stopped';
    case BotStatus.ERROR:
      return 'Error';
    case BotStatus.STARTING:
      return 'Starting';
    case BotStatus.STOPPING:
      return 'Stopping';
    default:
      return status;
    }
  };

  const canStart = bot.status === BotStatus.INACTIVE || bot.status === BotStatus.ERROR;
  const canStop = bot.status === BotStatus.ACTIVE;
  const hasProviders = bot.messageProviders.length > 0 || bot.llmProviders.length > 0;

  const handleStartBot = () => {
    if (onStartBot) {onStartBot(bot.id);}
  };

  const handleStopBot = () => {
    if (onStopBot) {onStopBot(bot.id);}
  };

  const handleConfigureBot = () => {
    if (onConfigureBot) {onConfigureBot(bot.id);}
    setIsDropdownOpen(false);
  };

  const handleCloneBot = () => {
    if (onCloneBot) {onCloneBot(bot.id);}
    setIsDropdownOpen(false);
  };

  const handleDeleteBot = () => {
    if (onDeleteBot) {onDeleteBot(bot.id);}
    setIsDropdownOpen(false);
  };

  const handleAddMessageProvider = () => {
    if (onAddProvider) {
      onAddProvider(bot.id, 'message');
      return;
    }

    setProviderModalState({
      isOpen: true,
      providerType: 'message',
      mode: 'create',
      botId: bot.id,
    });
  };

  const handleAddLLMProvider = () => {
    if (onAddProvider) {
      onAddProvider(bot.id, 'llm');
      return;
    }

    setProviderModalState({
      isOpen: true,
      providerType: 'llm',
      mode: 'create',
      botId: bot.id,
    });
  };

  const handleEditProvider = (provider: MessageProvider | LLMProvider) => {
    setProviderModalState({
      isOpen: true,
      providerType: provider.type as any, // Type narrowing might be needed but 'as any' is safe here given context
      mode: 'edit',
      provider: provider,
      botId: bot.id,
      isEdit: true,
    });
  };

  const handleRemoveProvider = (providerId: string) => {
    if (onRemoveProvider) {onRemoveProvider(bot.id, providerId);}
  };

  const handleProviderModalClose = () => {
    setProviderModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const handleProviderSubmit = () => {
    // This handler bridges the Modal submission to the parent's add/update logic.
    // Ideally update BotContext or call a prop function.
    handleProviderModalClose();
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300 hover:shadow-2xl transition-shadow duration-200">
      <div className="card-body p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="card-title text-lg font-semibold">{bot.name}</h2>
              <Badge variant={getStatusColor(bot.status)} size="sm">
                {getStatusText(bot.status)}
              </Badge>
            </div>
            {bot.description && (
              <p className="text-sm text-base-content/60 line-clamp-2">
                {bot.description}
              </p>
            )}
            {bot.error && (
              <div className="alert alert-error py-2 mt-2">
                <span className="text-xs">{bot.error}</span>
              </div>
            )}
          </div>

          {/* Dropdown Menu */}
          <div className={`dropdown dropdown-end ${autoPosition === 'top' ? 'dropdown-top' : ''} ${autoAlign}`} ref={dropdownRef}>
            <button
              className="btn btn-sm btn-ghost btn-circle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-label="More Options"
            >
              <MoreIcon className="w-4 h-4" />
            </button>
            {isDropdownOpen && (
              <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-10" ref={dropdownContentRef}>
                <li>
                  <a onClick={handleConfigureBot} className="flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4" />
                    Configure
                  </a>
                </li>
                <li>
                  <a onClick={handleCloneBot} className="flex items-center gap-2">
                    <CloneIcon className="w-4 h-4" />
                    Clone
                  </a>
                </li>
                <li>
                  <a onClick={handleDeleteBot} className="flex items-center gap-2 text-error">
                    <DeleteIcon className="w-4 h-4" />
                    Delete
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Persona Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-base-content/80">
                Persona
              </span>
              <Badge variant="neutral" size="xs">
                {currentPersona.isBuiltIn ? 'BUILTIN' : 'CUSTOM'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPersonaSelector(!showPersonaSelector)}
              disabled={bot.status === BotStatus.ACTIVE}
              className="px-2"
              aria-label="Edit Persona"
            >
              <EditIcon className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-3 bg-base-200/30 rounded-lg">
            <PersonaChip
              persona={currentPersona}
              size="lg"
              showUsage={true}
              clickable={false}
            />
          </div>
          {showPersonaSelector && (
            <div className="mt-3">
              <PersonaSelector
                personas={personas}
                selectedPersonaId={bot.personaId}
                onPersonaSelect={(personaId) => {
                  if (onPersonaChange) {onPersonaChange(bot.id, personaId);}
                  setShowPersonaSelector(false);
                }}
                allowCreate={true}
                onCreatePersona={() => {
                  window.location.href = '/admin/personas';
                }}
                size="compact"
              />
            </div>
          )}
        </div>

        {/* Message Providers Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-base-content/80">
                Message Providers
              </span>
              <Badge variant="neutral" size="xs">
                {bot.messageProviders.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMessageProvider}
              disabled={bot.status === BotStatus.ACTIVE}
              className="px-2"
              data-testid="add-message-provider-btn"
              aria-label="Add Message Provider"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
          <ProviderList
            providers={bot.messageProviders}
            type="message"
            onRemove={handleRemoveProvider}
            onEdit={handleEditProvider}
            disabled={bot.status === BotStatus.ACTIVE}
          />
        </div>

        {/* LLM Providers Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-base-content/80">
                LLM Providers
              </span>
              <Badge variant="neutral" size="xs">
                {bot.llmProviders.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddLLMProvider}
              disabled={bot.status === BotStatus.ACTIVE}
              className="px-2"
              data-testid="add-llm-provider-btn"
              aria-label="Add LLM Provider"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
          <ProviderList
            providers={bot.llmProviders}
            type="llm"
            onRemove={handleRemoveProvider}
            onEdit={handleEditProvider}
            disabled={bot.status === BotStatus.ACTIVE}
          />
        </div>

        {/* Footer Info and Actions */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-base-content/60">
            <div>Created: {new Date(bot.createdAt).toLocaleDateString()}</div>
            {bot.lastActive && (
              <div>Last active: {new Date(bot.lastActive).toLocaleDateString()}</div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleConfigureBot}
            >
              <SettingsIcon className="w-4 h-4" />
              Configure
            </Button>

            <Button
              variant={canStart ? 'success' : 'error'}
              size="sm"
              onClick={canStart ? handleStartBot : handleStopBot}
              disabled={!canStart && !canStop}
              className={!hasProviders ? 'btn-disabled' : ''}
            >
              {canStart ? (
                <>
                  <PlayIcon className="w-4 h-4" />
                  Start
                </>
              ) : (
                <>
                  <StopIcon className="w-4 h-4" />
                  Stop
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Warning for missing providers */}
        {!hasProviders && (
          <div className="alert alert-warning py-3 mt-4">
            <span className="text-xs">
              ⚠️ This bot has no providers configured. Add message and LLM providers before starting.
            </span>
          </div>
        )}

        {/* Provider Configuration Modal */}
        <ProviderConfigModal
          modalState={providerModalState}
          existingProviders={
            providerModalState.providerType === 'message' ? bot.messageProviders : bot.llmProviders
          }
          onClose={handleProviderModalClose}
          onSubmit={handleProviderSubmit}
        />
      </div>
    </div>
  );
};

export default BotCard;