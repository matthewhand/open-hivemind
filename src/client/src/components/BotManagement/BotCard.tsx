/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  BotInstance,
  MessageProvider,
  LLMProvider,
  Persona,
  ProviderModalState,
} from '../../types';
import {
  BotStatus,
  DEFAULT_PERSONA,
} from '../../types';
import Button from '../DaisyUI/Button';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import Dropdown from '../DaisyUI/Dropdown';
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
import { Alert } from '../DaisyUI/Alert';
import ProviderList from './ProviderList';
import PersonaChip from './PersonaChip';
import PersonaSelector from './PersonaSelector';
import ProviderConfigModal from '../ProviderConfiguration/ProviderConfigModal';

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
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [providerModalState, setProviderModalState] = useState<ProviderModalState>({
    isOpen: false,
    providerType: 'message',
    mode: 'create',
  });

  const currentPersona = (personas || []).find(p => p.id === bot.personaId) || DEFAULT_PERSONA;

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
    case 'active':
      return 'badge-success';
    case 'inactive':
    case 'stopping':
      return 'badge-ghost';
    case 'error':
      return 'badge-error';
    case 'starting':
      return 'badge-info';
    default:
      return 'badge-ghost';
    }
  };

  const getStatusText = (status: BotStatus) => {
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
  const hasProviders = (bot.messageProviders || []).length > 0 || (bot.llmProviders || []).length > 0;

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
    // Determine provider type from the provider's type string
    const providerType = provider.type.includes('discord') || provider.type.includes('slack') || provider.type.includes('telegram') || provider.type.includes('mattermost')
      ? 'message' as const
      : 'llm' as const;
    setProviderModalState({
      isOpen: true,
      providerType,
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
    <Card className="shadow-xl border border-base-300 hover:shadow-2xl transition-shadow duration-200">
      <Card.Body className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 min-w-0">
              <Card.Title className="text-lg font-semibold truncate break-all min-w-0" title={bot.name}>{bot.name}</Card.Title>
              <Badge variant={getStatusColor(bot.status) as "success" | "ghost" | "error" | "info"} size="sm" className="whitespace-nowrap shrink-0">
                {getStatusText(bot.status)}
              </Badge>
            </div>
            {bot.description && (
              <p className="text-sm text-base-content/60 line-clamp-2">
                {bot.description}
              </p>
            )}
            {bot.error && (
              <Alert status="error" className="py-2 mt-2">
                <span className="text-xs">{bot.error}</span>
              </Alert>
            )}
          </div>

          {/* Dropdown Menu */}
          <Dropdown
            trigger={<MoreIcon className="w-4 h-4" aria-hidden="true" />}
            position="bottom"
            color="ghost"
            size="sm"
            className="dropdown-end"
            triggerClassName="btn-circle"
            contentClassName="shadow-lg w-52 z-10"
            isOpen={isDropdownOpen}
            onToggle={(open) => setIsDropdownOpen(open)}
            hideArrow
            aria-label={`Options for ${bot.name}`}
          >
            <li>
              <a onClick={handleConfigureBot} className="flex items-center gap-2" role="menuitem">
                <SettingsIcon className="w-4 h-4" aria-hidden="true" />
                Configure
              </a>
            </li>
            <li>
              <a onClick={handleCloneBot} className="flex items-center gap-2" role="menuitem">
                <CloneIcon className="w-4 h-4" aria-hidden="true" />
                Clone
              </a>
            </li>
            <li>
              <a onClick={handleDeleteBot} className="flex items-center gap-2 text-error" role="menuitem">
                <DeleteIcon className="w-4 h-4" aria-hidden="true" />
                Delete
              </a>
            </li>
          </Dropdown>
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
              disabled={bot.status === 'active'}
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
                  navigate('/admin/personas');
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
                {(bot.messageProviders || []).length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMessageProvider}
              disabled={bot.status === 'active'}
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
            disabled={bot.status === 'active'}
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
                {(bot.llmProviders || []).length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddLLMProvider}
              disabled={bot.status === 'active'}
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
            disabled={bot.status === 'active'}
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
          <Alert status="warning" className="py-3 mt-4">
            <span className="text-xs">
              This bot has no providers configured. Add message and LLM providers before starting.
            </span>
          </Alert>
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
      </Card.Body>
    </Card>
  );
};

export default BotCard;