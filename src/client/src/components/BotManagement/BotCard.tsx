import React, { useState } from 'react';
import {
  BotInstance,
  MessageProvider,
  LLMProvider,
  BotStatus,
  Persona,
  DEFAULT_PERSONA
} from '../../types/bot';
import { Button, Badge } from '../DaisyUI';
import {
  Play as PlayIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Copy as CloneIcon,
  Trash2 as DeleteIcon,
  MoreVertical as MoreIcon,
  User as UserIcon,
  Edit as EditIcon,
  Plus as PlusIcon
} from 'lucide-react';
import ProviderList from './ProviderList';
import PersonaChip from './PersonaChip';
import PersonaSelector from './PersonaSelector';
import { ProviderConfigModal } from '../ProviderConfigModal';
import { getProviderSchema } from '../../provider-configs';

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
  onPersonaChange
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [providerModalState, setProviderModalState] = useState<{
    isOpen: boolean;
    providerType: 'message' | 'llm';
    editingProvider?: MessageProvider | LLMProvider;
  }>({
    isOpen: false,
    providerType: 'message'
  });

  const currentPersona = personas.find(p => p.id === bot.personaId) || DEFAULT_PERSONA;

  const getStatusColor = (status: BotStatus) => {
    switch (status) {
      case 'running':
        return 'badge-success';
      case 'stopped':
        return 'badge-ghost';
      case 'error':
        return 'badge-error';
      case 'starting':
        return 'badge-info';
      case 'stopping':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  const getStatusText = (status: BotStatus) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'stopped':
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

  const canStart = bot.status === 'stopped' || bot.status === 'error';
  const canStop = bot.status === 'running';
  const hasProviders = bot.messageProviders.length > 0 || bot.llmProviders.length > 0;

  const handleStartBot = () => {
    if (onStartBot) onStartBot(bot.id);
  };

  const handleStopBot = () => {
    if (onStopBot) onStopBot(bot.id);
  };

  const handleConfigureBot = () => {
    if (onConfigureBot) onConfigureBot(bot.id);
    setIsDropdownOpen(false);
  };

  const handleCloneBot = () => {
    if (onCloneBot) onCloneBot(bot.id);
    setIsDropdownOpen(false);
  };

  const handleDeleteBot = () => {
    if (onDeleteBot) onDeleteBot(bot.id);
    setIsDropdownOpen(false);
  };

  const handleAddMessageProvider = () => {
    setProviderModalState({
      isOpen: true,
      providerType: 'message'
    });
  };

  const handleAddLLMProvider = () => {
    setProviderModalState({
      isOpen: true,
      providerType: 'llm'
    });
  };

  const handleEditProvider = (provider: MessageProvider | LLMProvider) => {
    setProviderModalState({
      isOpen: true,
      providerType: provider.type === 'message' ? 'message' : 'llm',
      editingProvider: provider
    });
  };

  const handleRemoveProvider = (providerId: string) => {
    if (onRemoveProvider) onRemoveProvider(bot.id, providerId);
  };

  const handleProviderModalClose = () => {
    setProviderModalState({
      isOpen: false,
      providerType: 'message'
    });
  };

  const handleProviderSave = (providerType: string, config: Record<string, any>) => {
    if (providerModalState.editingProvider) {
      // Update existing provider
      // This would integrate with your update provider service
      console.log('Updating provider:', providerModalState.editingProvider.id, config);
    } else {
      // Add new provider
      if (onAddProvider) {
        onAddProvider(bot.id, providerType as 'message' | 'llm');
      }
    }
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
              <Badge color={getStatusColor(bot.status)} size="sm">
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
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-sm btn-ghost btn-circle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <MoreIcon className="w-4 h-4" />
            </button>
            {isDropdownOpen && (
              <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-52 z-10">
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
              <Badge color="neutral" size="xs">
                {currentPersona.isBuiltIn ? 'BUILTIN' : 'CUSTOM'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPersonaSelector(!showPersonaSelector)}
              disabled={bot.status === 'running'}
              className="px-2"
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
                  if (onPersonaChange) onPersonaChange(bot.id, personaId);
                  setShowPersonaSelector(false);
                }}
                allowCreate={true}
                onCreatePersona={() => {
                  // Navigate to personas page or open modal
                  window.location.href = '/uber/personas';
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
              <Badge color="neutral" size="xs">
                {bot.messageProviders.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddMessageProvider}
              disabled={bot.status === 'running'}
              className="px-2"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
          <ProviderList
            providers={bot.messageProviders}
            type="message"
            onRemove={handleRemoveProvider}
            onEdit={handleEditProvider}
            disabled={bot.status === 'running'}
          />
        </div>

        {/* LLM Providers Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-base-content/80">
                LLM Providers
              </span>
              <Badge color="neutral" size="xs">
                {bot.llmProviders.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddLLMProvider}
              disabled={bot.status === 'running'}
              className="px-2"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
          <ProviderList
            providers={bot.llmProviders}
            type="llm"
            onRemove={handleRemoveProvider}
            onEdit={handleEditProvider}
            disabled={bot.status === 'running'}
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
              variant={canStart ? "success" : "error"}
              size="sm"
              onClick={canStart ? handleStartBot : handleStopBot}
              disabled={!canStart && !canStop}
              className={!hasProviders ? "btn-disabled" : ""}
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
          isOpen={providerModalState.isOpen}
          providerType={providerModalState.providerType}
          initialProvider={providerModalState.editingProvider}
          initialConfig={providerModalState.editingProvider?.config}
          onClose={handleProviderModalClose}
          onSave={handleProviderSave}
        />
      </div>
    </div>
  );
};

export default BotCard;