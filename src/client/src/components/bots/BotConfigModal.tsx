import React from 'react';
import type { BotConfig } from '../../types/bot';
import { CreateBotWizard } from '../BotManagement/CreateBotWizard';
import { BotSettingsModal } from '../BotSettingsModal';
import ImportBotsModal from '../BotManagement/ImportBotsModal';

interface BotConfigModalProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  handleCreateBot: (botData: any) => Promise<void>;

  editingBot: BotConfig | null;
  setEditingBot: (bot: BotConfig | null) => void;
  handleUpdateBot: (botData: any) => Promise<void>;
  setDeletingBot: (bot: BotConfig | null) => void;
  setPreviewBot: (bot: BotConfig | null) => void;

  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  existingBotNames: string[];
  fetchBots: () => void;

  personas: any[];
  llmProfiles: any[];
  getIntegrationOptions: (category: 'llm' | 'message') => string[];
}

export const BotConfigModal: React.FC<BotConfigModalProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
  handleCreateBot,
  editingBot,
  setEditingBot,
  handleUpdateBot,
  setDeletingBot,
  setPreviewBot,
  isImportModalOpen,
  setIsImportModalOpen,
  existingBotNames,
  fetchBots,
  personas,
  llmProfiles,
  getIntegrationOptions,
}) => {
  return (
    <>
      {isCreateModalOpen && (
        <CreateBotWizard
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateBot}
        />
      )}

      {editingBot && (
        <BotSettingsModal
          isOpen={!!editingBot}
          bot={editingBot as any}
          onClose={() => setEditingBot(null)}
          personas={personas}
          llmProfiles={llmProfiles}
          integrationOptions={{ message: getIntegrationOptions('message') }}
          onUpdateConfig={async (bot, key, value) => {
            await handleUpdateBot({ ...bot, [key]: value });
          }}
          onUpdatePersona={async (bot, personaId) => {
            await handleUpdateBot({ ...bot, persona: personaId });
          }}
          onClone={(bot) => {
            setEditingBot(null);
            handleCreateBot({ ...bot, name: `${bot.name}-copy`, id: undefined });
          }}
          onDelete={(bot) => {
            setEditingBot(null);
            setDeletingBot(bot as any);
          }}
          onViewDetails={(bot) => setPreviewBot(bot as any)}
        />
      )}

      <ImportBotsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingBotNames={existingBotNames}
        onImportComplete={() => {
          setIsImportModalOpen(false);
          fetchBots();
        }}
      />
    </>
  );
};
